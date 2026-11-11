const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Product, Outlet, Bill, BillLineItem, InventoryLot, OutletInventory, UnitMaster } = require('../src/models');
const costs = require('../src/services/inventoryCostService');
const { buildProfitData, allocateDiscount } = require('../src/services/profitReportService');
after(() => sequelize.close());

test('discount allocation reconciles currency cents and excludes tax', () => {
  assert.deepEqual(allocateDiscount([{ qty: 1, price: 1 }, { qty: 1, price: 1 }, { qty: 1, price: 1 }], 0.01), [0.99, 1, 1]);
  const report = buildProfitData([{ subtotal: 100, tax: 6, discount_amount: 5, voucher_discount_amount: 3, points_discount_amount: 2,
    lineItems: [{ item_type: 'product', item_id: 1, item_name: 'Shampoo', barcode: '001', qty: 1, price: 100, cost_total: 50 }] }], []);
  assert.equal(report.netRevenue, 90); assert.equal(report.grossProfit, 40); assert.equal(report.taxCollected, 6);
});
test('fractional line revenue reconciles to the currency subtotal', () => {
  const lines = [{ qty: 0.3333, price: 1 }, { qty: 0.3333, price: 1 }, { qty: 0.3333, price: 1 }];
  assert.deepEqual(allocateDiscount(lines, 0), [0.34, 0.33, 0.33]);
  assert.equal(allocateDiscount(lines, 1).reduce((sum, value) => sum + value, 0), 0);
});

test('unknown acquisition costs are not reported as zero profit or zero cost', () => {
  const report = buildProfitData([{ subtotal: 100, lineItems: [{ item_type: 'product', item_id: 1, qty: 1, price: 100, cost_total: null }] }], []);
  assert.equal(report.netProfit, null); assert.equal(report.productProfits[0].grossProfit, null); assert.equal(report.unknownCostLines, 1);
});
test('FIFO costs survive transfers, sales, edits and later prices; all writes rolled back', async () => {
  const transaction = await sequelize.transaction();
  try {
    const outlet = await Outlet.findOne({ transaction });
    assert.ok(outlet, 'Local integration checks require an existing outlet.');
    const product = await Product.create({ item_name: 'Cost test rollback', barcode: `TEST-${Date.now()}`, unit_price: 100, central_stock: 0 }, { transaction });
    await costs.receivePurchase({ id: `test-${product.id}-1`, product_id: product.id, qty: 10, unit_price: 50 }, transaction);
    await costs.receivePurchase({ id: `test-${product.id}-2`, product_id: product.id, qty: 10, unit_price: 60 }, transaction);
    // Repeated receipt has no effect.
    await costs.receivePurchase({ id: `test-${product.id}-2`, product_id: product.id, qty: 10, unit_price: 60 }, transaction);
    const locked = (await costs.lockProducts([product.id], transaction)).get(product.id);
    await costs.transfer(locked, outlet.id, 15, `test-${product.id}`, transaction);
    const bill = await Bill.create({ bill_number: `TEST-${Date.now()}`, outlet_id: outlet.id, subtotal: 1200, total: 1200 }, { transaction });
    const input = { itemId: product.id, itemType: 'product', itemName: product.item_name, qty: 12, price: 100, barcode: product.barcode, unit: 'pack', staffIds: ['1', '2'] };
    const [line] = await costs.applyBillLines(bill, [input], [], transaction);
    assert.equal(Number(line.cost_total), 620);
    assert.deepEqual(line.staff_ids, ['1', '2']);
    assert.equal(line.barcode, product.barcode);
    assert.equal(Number(line.base_qty), 12);
    const stock = await OutletInventory.findOne({ where: { product_id: product.id, outlet_id: outlet.id }, transaction });
    assert.equal(Number(stock.current_stock), 3);
    await product.update({ unit_price: 999, barcode: `NEW-${product.id}` }, { transaction });
    const [edited] = await costs.applyBillLines(bill, [{ ...input, billLineId: line.id, staffIds: ['2'] }], [line], transaction);
    assert.equal(Number(edited.cost_total), 620);
    assert.equal(edited.barcode, input.barcode);
    assert.deepEqual(edited.cost_allocations, line.cost_allocations);
    await product.update({ product_measure: 2 }, { transaction });
    const [decreased] = await costs.applyBillLines(bill, [{ ...input, billLineId: edited.id, barcode: product.barcode, qty: 11 }], [edited], transaction);
    assert.equal(Number(decreased.cost_total), 560);
    await stock.reload({ transaction }); assert.equal(Number(stock.current_stock), 4);
    const report = buildProfitData([{ ...bill.toJSON(), subtotal: 1100, lineItems: [decreased] }], []);
    assert.equal(report.productProfits[0].grossProfit, 540);
    const lots = await InventoryLot.findAll({ where: { product_id: product.id }, transaction });
    assert.equal(lots.reduce((sum, lot) => sum + Number(lot.remaining_qty), 0), 9);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});
test('pack conversions and shared consumption reject aggregate overselling and roll back', async () => {
  const transaction = await sequelize.transaction();
  try {
    const outlet = await Outlet.findOne({ transaction });
    const unit = await UnitMaster.create({ group_name: 'Test litres', primary_unit: 'Litre', primary_abbr: 'L', secondary_unit: 'Millilitre', secondary_abbr: 'ML', conversion_ratio: 1000 }, { transaction });
    const product = await Product.create({ item_name: 'Test 500ml pack', unit_price: 100, unit_master_id: unit.id, product_measure: 500, product_measure_unit: 'secondary', central_stock: 0 }, { transaction });
    await costs.receivePurchase({ id: `fraction-${product.id}`, product_id: product.id, qty: 0.5, unit_price: 40 }, transaction);
    const locked = (await costs.lockProducts([product.id], transaction)).get(product.id);
    assert.equal(costs.baseQuantity(1, 'pack', locked).toNumber(), 0.5);
    await costs.transfer(locked, outlet.id, 0.5, `fraction-${product.id}`, transaction);
    const bill = await Bill.create({ bill_number: `TEST-FRACTION-${Date.now()}`, outlet_id: outlet.id }, { transaction });
    const [line] = await costs.applyBillLines(bill, [{ itemId: product.id, itemName: product.item_name, itemType: 'product', unit: 'pack', qty: 1, price: 100 }], [], transaction);
    assert.equal(Number(line.cost_total), 20);
    const [restored] = await costs.applyBillLines(bill, [{ itemId: product.id, itemName: product.item_name, itemType: 'product', unit: 'secondary', qty: 250, price: 0.2 }], [line], transaction);
    assert.equal(Number(restored.cost_total), 10);
    await assert.rejects(() => costs.applyBillLines(bill, [
      { itemId: product.id, itemName: product.item_name, itemType: 'product', unit: 'secondary', qty: 400, price: 0.2 },
      { itemId: 1, itemName: 'Service', itemType: 'service', qty: 1, price: 10, productConsumption: [{ productId: product.id, qty: 200, unit: 'secondary' }] },
    ], [restored], transaction), /Insufficient stock/);
  } finally { if (!transaction.finished) await transaction.rollback(); }
});

test('unique product barcodes retain leading zeros and reject duplicates', async () => {
  const transaction = await sequelize.transaction();
  try {
    const code = `000-${Date.now()}`;
    const product = await Product.create({ item_name: 'Code test', barcode: code, unit_price: 1 }, { transaction });
    await product.reload({ transaction });
    assert.equal(product.barcode, code);
    await assert.rejects(() => Product.create({ item_name: 'Duplicate code', barcode: code, unit_price: 1 }, { transaction }), { name: 'SequelizeUniqueConstraintError' });
  } finally { if (!transaction.finished) await transaction.rollback(); }
});

test('stock mutation product locks serialize competing tills', async () => {
  const product = await Product.findOne();
  if (!product) return;
  const first = await sequelize.transaction();
  const second = await sequelize.transaction();
  try {
    await costs.lockProducts([product.id], first);
    let acquired = false;
    const competing = costs.lockProducts([product.id], second).then(() => { acquired = true; });
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(acquired, false);
    await first.rollback();
    await competing;
    assert.equal(acquired, true);
  } finally {
    if (!first.finished) await first.rollback();
    if (!second.finished) await second.rollback();
  }
});

test('profit PDF paginates barcode detail and keeps unknown costs explicit', () => {
  const { generateProfitPDF } = require('../src/services/profitPdfService');
  const pdf = generateProfitPDF({ netRevenue: 100, costOfGoodsSold: null, knownCostOfGoodsSold: 20, grossProfit: null, netProfit: null,
    totalExpenses: 0, taxCollected: 6, profitMarginPercent: null, unknownCostLines: 1,
    productProfits: Array.from({ length: 65 }, (_, i) => ({ name: `Shampoo (${i})`, barcode: `000${i}`, qtySold: 1, netRevenue: 100, costTotal: null, grossProfit: null, marginPercent: null })) });
  const text = pdf.toString();
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.match(text, /\/Count 5/);
  assert.match(text, /Barcode: 00064/);
  assert.match(text, /Cost: Unknown/);
  const offset = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(pdf.subarray(offset, offset + 4).toString(), 'xref');
});
