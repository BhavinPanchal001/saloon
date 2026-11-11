const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Product, Outlet, Bill, InventoryLot, OutletInventory, UnitMaster } = require('../src/models');
const costs = require('../src/services/inventoryCostService');
after(() => sequelize.close());
async function fixture(transaction) {
  const outlet = await Outlet.findOne({ transaction });
  const product = await Product.create({ item_name: 'Audit rollback product', barcode: `AUDIT-${Date.now()}-${Math.random()}`, unit_price: 200, central_stock: 0 }, { transaction });
  const bill = await Bill.create({ bill_number: `AUDIT-${Date.now()}-${product.id}`, outlet_id: outlet.id }, { transaction });
  return { product, outlet, bill };
}
test('increasing a sold quantity must not reprice original units from another lot', async () => {
  const transaction = await sequelize.transaction();
  try {
    const { product, outlet, bill } = await fixture(transaction);
    await costs.addLot({ productId: product.id, locationId: outlet.id, quantity: 1, unitCost: 100, source: `audit-old:${product.id}`, receivedAt: new Date('2026-01-02') }, transaction);
    await costs.changeBalance(product, outlet.id, 1, transaction);
    const input = { itemId: product.id, itemType: 'product', itemName: product.item_name, qty: 1, price: 200, unit: 'pack' };
    const [sold] = await costs.applyBillLines(bill, [input], [], transaction);
    await costs.addLot({ productId: product.id, locationId: outlet.id, quantity: 3, unitCost: 5, source: `audit-new:${product.id}`, receivedAt: new Date('2026-01-01') }, transaction);
    await costs.changeBalance(product, outlet.id, 3, transaction);
    const [edited] = await costs.applyBillLines(bill, [{ ...input, billLineId: sold.id, qty: 2 }], [sold], transaction);
    assert.equal(Number(edited.cost_total), 105);
    const [decreased] = await costs.applyBillLines(bill, [{ ...input, billLineId: edited.id, qty: 1 }], [edited], transaction);
    assert.equal(Number(decreased.cost_total), 100);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});
test('zero product consumption is valid and does not invalidate a service sale', async () => {
  const transaction = await sequelize.transaction();
  try {
    const { product, bill } = await fixture(transaction);
    const [line] = await costs.applyBillLines(bill, [{ itemId: 1, itemType: 'service', itemName: 'No material used', qty: 1, price: 20,
      productConsumption: [{ productId: product.id, qty: 0, unit: 'primary' }] }], [], transaction);
    assert.equal(Number(line.cost_total), 0);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});
test('missing or malformed selling prices are client errors, not free items', async () => {
  const transaction = await sequelize.transaction();
  try {
    const { bill } = await fixture(transaction);
    for (const value of [undefined, null, '', 'not-a-price', Infinity]) {
      await assert.rejects(() => costs.applyBillLines(bill, [{ itemId: 1, itemType: 'service', itemName: 'Invalid price', qty: 1, price: value }], [], transaction), (error) => error.status === 400);
    }
  } finally { if (!transaction.finished) await transaction.rollback(); }
});
test('material conversion snapshots survive service quantity edits after unit changes', async () => {
  const transaction = await sequelize.transaction();
  try {
    const { product, outlet, bill } = await fixture(transaction);
    const unit = await UnitMaster.create({ group_name: 'Audit unit', primary_unit: 'Litre', primary_abbr: 'L', secondary_unit: 'Millilitre', secondary_abbr: 'ML', conversion_ratio: 1000 }, { transaction });
    await product.update({ unit_master_id: unit.id }, { transaction });
    await costs.addLot({ productId: product.id, locationId: outlet.id, quantity: 1, unitCost: 100, source: `audit-service:${product.id}` }, transaction);
    await costs.changeBalance(product, outlet.id, 1, transaction);
    const input = { itemId: 1, itemType: 'service', itemName: 'Treatment', qty: 1, price: 200, productConsumption: [{ productId: product.id, qty: 100, unit: 'secondary' }] };
    const [line] = await costs.applyBillLines(bill, [input], [], transaction);
    await unit.update({ conversion_ratio: 100 }, { transaction });
    const [edited] = await costs.applyBillLines(bill, [{ ...input, billLineId: line.id, qty: 2, productConsumption: [{ productId: product.id, qty: 200, unit: 'secondary' }] }], [line], transaction);
    assert.equal(Number(edited.cost_total), 20);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});

test('removing opening stock cannot silently remove a purchased lot', async () => {
  const transaction = await sequelize.transaction();
  try {
    const { product } = await fixture(transaction);
    await costs.receivePurchase({ id: `audit-purchase-${product.id}`, product_id: product.id, qty: 5, unit_price: 20 }, transaction);
    await product.reload({ transaction });
    await assert.rejects(() => costs.adjustOpening(product, -1, null, transaction), /Insufficient stock/);
    await product.reload({ transaction }); assert.equal(Number(product.central_stock), 5);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});

test('legacy unknown costs remain unknown when quantities are edited', async () => {
  const transaction = await sequelize.transaction();
  try {
    const { product, outlet, bill } = await fixture(transaction);
    const { BillLineItem } = require('../src/models');
    const old = await BillLineItem.create({ bill_id: bill.id, item_id: product.id, item_type: 'product', item_name: product.item_name, qty: 1, price: 200, product_consumption: { unit: 'primary' } }, { transaction });
    await costs.addLot({ productId: product.id, locationId: outlet.id, quantity: 2, unitCost: 30, source: `audit-legacy-new:${product.id}`, receivedAt: new Date('2020-01-01') }, transaction);
    await costs.changeBalance(product, outlet.id, 2, transaction);
    const [edited] = await costs.applyBillLines(bill, [{ itemId: product.id, billLineId: old.id, itemType: 'product', itemName: product.item_name, qty: 2, price: 200, unit: 'primary' }], [old], transaction);
    assert.equal(edited.cost_total, null);
    assert.equal(edited.cost_allocations.length, 2);
    const stock = await OutletInventory.findOne({ where: { product_id: product.id, outlet_id: outlet.id }, transaction });
    assert.equal(Number(stock.current_stock), 1);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});

test('checkout retries are order-independent but cannot change an already committed sale', () => {
  const { checkoutHash, assertSameCheckout } = require('../src/utils/checkoutRequest');
  const a = checkoutHash({ outletId: 1, lineItems: [{ qty: 1, price: 100 }], checkoutKey: 'one' });
  const same = checkoutHash({ lineItems: [{ price: 100, qty: 1 }], checkoutKey: 'two', outletId: 1, sendWhatsApp: false });
  assert.equal(a, same);
  const b = checkoutHash({ outletId: 1, lineItems: [{ qty: 2, price: 100 }] });
  assert.throws(() => assertSameCheckout({ request_hash: a, bill_number: 'BILL-1' }, b), (error) => error.status === 409);
});

test('report boundaries follow the business day, including DST and invalid dates', () => {
  const { reportRange } = require('../src/utils/reportDates');
  const { Op } = require('sequelize');
  const india = reportRange({ startDate: '2026-10-27', endDate: '2026-10-27', timeZone: 'Asia/Kolkata' });
  assert.equal(india.range[Op.gte].toISOString(), '2026-10-26T18:30:00.000Z');
  assert.equal(india.range[Op.lt].toISOString(), '2026-10-27T18:30:00.000Z');
  const dst = reportRange({ startDate: '2026-03-08', endDate: '2026-03-08', timeZone: 'America/New_York' });
  assert.equal(dst.range[Op.lt] - dst.range[Op.gte], 23 * 60 * 60 * 1000);
  assert.throws(() => reportRange({ startDate: '2026-02-30' }), (error) => error.status === 400);
  assert.throws(() => reportRange({ startDate: '2026-10-28', endDate: '2026-10-27' }), (error) => error.status === 400);
});

test('redemption discounts equal the monetary value of whole redeemed points', () => {
  const { calculateRedemption } = require('../src/utils/redemption');
  assert.deepEqual(calculateRedemption({ requested: 50, available: 50, pointValue: 2, minimum: 1, maxPercent: 50, netSales: 11 }), { points: 2, discount: 4 });
  assert.deepEqual(calculateRedemption({ requested: 50, available: 50, pointValue: 1, minimum: 10, maxPercent: 50, netSales: 0 }), { points: 0, discount: 0 });
  assert.deepEqual(calculateRedemption({ requested: 50, available: 50, pointValue: 1, minimum: 10, maxPercent: 50, netSales: 100 }), { points: 50, discount: 50 });
});

test('opening-lot migration retry does not duplicate stock for a new tracked product', async () => {
  const transaction = await sequelize.transaction();
  try {
    const { product } = await fixture(transaction);
    await costs.receivePurchase({ id: `migration-retry-${product.id}`, product_id: product.id, qty: 5, unit_price: 20 }, transaction);
    await require('../src/services/openingLotMigration').seedOpeningLots(sequelize, transaction);
    const lots = await InventoryLot.findAll({ where: { product_id: product.id, location_id: 0 }, transaction });
    assert.equal(lots.reduce((sum, lot) => sum + Number(lot.remaining_qty), 0), 5);
    assert.equal(lots.length, 1);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});

test('CSV text cannot become a spreadsheet formula', () => {
  const { csvCell } = require('../src/utils/csvCell');
  assert.equal(csvCell('000123'), '"000123"');
  assert.equal(csvCell('=HYPERLINK("test")'), '"\'=HYPERLINK(""test"")"');
  assert.equal(csvCell('normal "text"'), '"normal ""text"""');
});

test('malformed service/package consumption returns a validation error', () => {
  for (const item of [
    { itemType: 'service', productConsumption: {} },
    { itemType: 'package', includedServices: {} },
    { itemType: 'package', includedServices: [null] },
  ]) assert.throws(() => costs.validateLines([{ itemId: 1, qty: 1, price: 1, ...item }]), (error) => error.status === 400);
});

test('reward administration guard ignores storage-account type and overbroad token claims', () => {
  const { requireBusinessAdmin } = require('../src/middleware/auth');
  let status, continued = false;
  const res = { status(value) { status = value; return this; }, json() {} };
  requireBusinessAdmin({ user: { role: 'cashier', userType: 'admin', permissions: ['*'] } }, res, () => { continued = true; });
  assert.equal(status, 403); assert.equal(continued, false);
  requireBusinessAdmin({ user: { role: 'admin' } }, res, () => { continued = true; });
  assert.equal(continued, true);
});
