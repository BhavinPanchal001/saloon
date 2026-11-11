const Decimal = require('decimal.js');
const { Op } = require('sequelize');
const { Product, UnitMaster, OutletInventory, InventoryLot, InventoryMovement, BillLineItem } = require('../models');
const D = (value = 0) => new Decimal(value ?? 0);
const qty = (value) => D(value).toDecimalPlaces(4);
const money = (value) => D(value).toDecimalPlaces(2);
function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function positive(value, label = 'Quantity') {
  let n;
  try { n = D(value); } catch { invalid(`${label} must be a positive number.`); }
  if (!n.isFinite() || n.lte(0) || qty(n).lte(0)) invalid(`${label} must be a positive number (minimum 0.0001).`);
  return qty(n);
}
function baseQuantity(value, unit, product) {
  if (!['primary', 'secondary', 'pack'].includes(unit || 'primary')) invalid('Invalid product unit.');
  const n = positive(value);
  const ratio = D(product.unitMaster?.conversion_ratio || 1);
  if (ratio.lte(0)) invalid('Product conversion ratio must be positive.');
  const factor = unit === 'pack' ? D(product.product_measure || 1).div(product.product_measure_unit === 'secondary' ? ratio : 1) : unit === 'secondary' ? D(1).div(ratio) : D(1);
  const base = qty(n.times(factor));
  if (base.lte(0)) invalid('Quantity is too small for this product unit.');
  return base;
}
function signature(item) {
  const consumptions = item.itemType === 'service' ? item.productConsumption || []
    : item.itemType === 'package' ? (item.includedServices || []).flatMap((s) => s.productConsumption || []) : [];
  return JSON.stringify([item.itemType, String(item.itemId || item.id), D(item.qty).toString(),
    item.itemType === 'product' ? item.unit || item.productConsumption?.unit || 'primary' : '',
    consumptions.map((c) => [String(c.productId), D(c.qty).toString(), c.unit || 'primary']).sort()]);
}
async function lockProducts(ids, transaction) {
  const unique = [...new Set(ids.map(Number))].sort((a, b) => a - b);
  const products = await Product.findAll({ where: { id: unique }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
  if (products.length !== unique.length) invalid('One or more selected products no longer exist.');
  for (const product of products) {
    product.unitMaster = product.unit_master_id ? await UnitMaster.findByPk(product.unit_master_id, { transaction }) : null;
  }
  return new Map(products.map((p) => [Number(p.id), p]));
}
async function movement(productId, locationId, lotId, quantity, unitCost, reference, transaction) {
  await InventoryMovement.create({ product_id: productId, location_id: locationId, lot_id: lotId,
    quantity: qty(quantity).toFixed(4), unit_cost: unitCost, reference }, { transaction });
}
async function addLot({ productId, locationId = 0, quantity, unitCost = null, source, receivedAt = new Date() }, transaction) {
  if (D(quantity).eq(0)) return null;
  const [lot, created] = await InventoryLot.findOrCreate({ where: { source_key: source }, defaults: {
    product_id: productId, location_id: locationId, received_at: receivedAt,
    remaining_qty: qty(quantity).toFixed(4), unit_cost: unitCost === null ? null : D(unitCost).toFixed(6),
  }, transaction });
  if (created) await movement(productId, locationId, lot.id, quantity, lot.unit_cost, source, transaction);
  return lot;
}
async function changeBalance(product, locationId, delta, transaction) {
  if (Number(locationId) === 0) {
    await product.update({ central_stock: qty(D(product.central_stock).plus(delta)).toFixed(4) }, { transaction });
  } else {
    const [inventory] = await OutletInventory.findOrCreate({ where: { product_id: product.id, outlet_id: locationId }, defaults: { current_stock: 0 }, transaction });
    await inventory.update({ current_stock: qty(D(inventory.current_stock).plus(delta)).toFixed(4) }, { transaction });
  }
}
async function consume(product, locationId, quantity, reference, transaction, allowNegative = false, eligibleLotIds = null) {
  const required = positive(quantity);
  const lots = await InventoryLot.findAll({ where: { product_id: product.id, location_id: locationId, ...(eligibleLotIds ? { id: eligibleLotIds } : {}) }, order: [['received_at', 'ASC'], ['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
  const available = lots.reduce((sum, lot) => sum.plus(lot.remaining_qty), D(0));
  if (available.lt(required) && !allowNegative) invalid(`Insufficient stock for ${product.item_name}: need ${required}, available ${available} in base units.`);
  let left = required;
  const allocations = [];
  // Negative balances represent uncosted sales. Do not allocate positive receipts twice.
  let debt = Decimal.max(0, lots.reduce((sum, lot) => sum.plus(Decimal.min(0, D(lot.remaining_qty))), D(0)).neg());
  for (const lot of lots) {
    let usable = Decimal.max(0, D(lot.remaining_qty));
    const debtPortion = Decimal.min(debt, usable); debt = debt.minus(debtPortion); usable = usable.minus(debtPortion);
    const take = Decimal.min(usable, left);
    if (take.lte(0)) continue;
    await lot.update({ remaining_qty: D(lot.remaining_qty).minus(take).toFixed(4) }, { transaction });
    allocations.push({ productId: product.id, locationId, lotId: lot.id, qty: take.toFixed(4), unitCost: lot.unit_cost });
    await movement(product.id, locationId, lot.id, take.neg(), lot.unit_cost, reference, transaction);
    left = left.minus(take); if (left.eq(0)) break;
  }
  if (left.gt(0)) {
    const lot = await addLot({ productId: product.id, locationId, quantity: left.neg(), source: `${reference}:short:${product.id}:${Date.now()}:${Math.random()}` }, transaction);
    allocations.push({ productId: product.id, locationId, lotId: lot.id, qty: left.toFixed(4), unitCost: null });
  }
  await changeBalance(product, locationId, required.neg(), transaction);
  return allocations;
}
async function restore(allocations, products, reference, transaction) {
  for (const allocation of allocations) {
    const product = products.get(Number(allocation.productId));
    const lot = await InventoryLot.findByPk(allocation.lotId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!lot || !product) invalid('Original cost allocation is unavailable; invoice cannot be reversed safely.');
    await lot.update({ remaining_qty: D(lot.remaining_qty).plus(allocation.qty).toFixed(4) }, { transaction });
    await changeBalance(product, allocation.locationId, allocation.qty, transaction);
    await movement(product.id, allocation.locationId, lot.id, allocation.qty, allocation.unitCost, reference, transaction);
  }
}
function consumptionItems(item) {
  if (item.itemType === 'product') return [{ productId: item.itemId || item.id, qty: item.qty, unit: item.unit || item.productConsumption?.unit || 'primary' }];
  if (item.itemType === 'service') {
    if (item.productConsumption != null && !Array.isArray(item.productConsumption)) invalid('Service product consumption must be a list.');
    return item.productConsumption || [];
  }
  if (item.itemType === 'package') {
    if (item.includedServices != null && !Array.isArray(item.includedServices)) invalid('Included services must be a list.');
    return (item.includedServices || []).flatMap((service) => {
      if (!service || (service.productConsumption != null && !Array.isArray(service.productConsumption))) invalid('Package product consumption must be a list.');
      return service.productConsumption || [];
    });
  }
  invalid('Invalid bill item type.');
}
function oldToInput(line) {
  return { itemId: line.item_id, itemType: line.item_type, qty: line.qty, productConsumption: line.product_consumption, includedServices: line.included_services };
}
function numeric(value, label, { allowZero = true, places = 6 } = {}) {
  if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) invalid(`${label} is required.`);
  let number;
  try { number = D(value); } catch { invalid(`${label} must be a number.`); }
  if (!number.isFinite() || number.lt(0) || (!allowZero && number.eq(0))) invalid(`${label} must be ${allowZero ? 'non-negative' : 'positive'}.`);
  return number.toDecimalPlaces(places);
}
function validateLines(items) {
  if (!Array.isArray(items) || !items.length) invalid('At least one bill item is required.');
  const refs = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object') invalid('Invalid bill item.');
    if (!Number.isSafeInteger(Number(item.itemId || item.id)) || Number(item.itemId || item.id) <= 0) invalid('A valid item ID is required.');
    positive(item.qty);
    numeric(item.price, 'Selling price');
    if (item.billLineId) {
      if (refs.has(String(item.billLineId))) invalid('An invoice line cannot be submitted twice.');
      refs.add(String(item.billLineId));
    }
    for (const c of consumptionItems(item)) {
      if (!c || !Number.isSafeInteger(Number(c.productId)) || Number(c.productId) <= 0) invalid('A valid consumed product ID is required.');
      numeric(c.qty, 'Product consumption', { places: 4 });
      if (!['primary', 'secondary', 'pack'].includes(c.unit || 'primary')) invalid('Invalid product unit.');
    }
  }
}
function savedRequirements(line, products) {
  if (Array.isArray(line.stock_requirements)) return line.stock_requirements;
  const inputs = consumptionItems(oldToInput(line));
  if (line.item_type === 'product' && line.base_qty != null) return inputs.map((c) => ({ ...c, qty: String(c.qty), baseQty: String(line.base_qty) }));
  // Upgrade old cost snapshots where the original conversion can be inferred unambiguously.
  return inputs.map((c) => {
    const sameProduct = inputs.filter((v) => Number(v.productId) === Number(c.productId));
    const allSameUnit = sameProduct.every((v) => (v.unit || 'primary') === (c.unit || 'primary'));
    const enteredTotal = sameProduct.reduce((sum, v) => sum.plus(v.qty), D(0));
    const allocations = (line.cost_allocations || []).filter((v) => Number(v.productId) === Number(c.productId));
    if (allocations.length && allSameUnit && enteredTotal.gt(0)) {
      const baseTotal = allocations.reduce((sum, v) => sum.plus(v.qty), D(0));
      return { ...c, qty: String(c.qty), baseQty: qty(baseTotal.times(c.qty).div(enteredTotal)).toFixed(4) };
    }
    return { ...c, qty: String(c.qty), baseQty: D(c.qty).eq(0) ? '0.0000' : baseQuantity(c.qty, c.unit, products.get(Number(c.productId))).toFixed(4) };
  });
}
function requirements(item, original, products) {
  const saved = original ? savedRequirements(original, products) : [];
  return consumptionItems(item).map((c) => {
    const product = products.get(Number(c.productId));
    const entered = numeric(c.qty, 'Product consumption', { places: 4 });
    const previous = saved.filter((v) => Number(v.productId) === Number(c.productId) && (v.unit || 'primary') === (c.unit || 'primary'));
    const previousQty = previous.reduce((sum, v) => sum.plus(v.qty), D(0));
    const previousBase = previous.reduce((sum, v) => sum.plus(v.baseQty), D(0));
    const base = entered.eq(0) ? D(0) : previousQty.gt(0) ? qty(entered.times(previousBase).div(previousQty)) : baseQuantity(entered, c.unit, product);
    if (entered.gt(0) && base.lte(0)) invalid('Consumed quantity is below stock precision.');
    return { productId: product.id, qty: entered.toFixed(4), unit: c.unit || 'primary', baseQty: base.toFixed(4) };
  });
}
async function applyBillLines(bill, items, oldLines, transaction, options = {}) {
  validateLines(items);
  const allIds = [...items.flatMap(consumptionItems), ...oldLines.flatMap((line) => line.cost_allocations || consumptionItems(oldToInput(line)))].map((c) => c.productId);
  const products = await lockProducts(allIds, transaction);
  const unused = new Map(oldLines.map((line) => [line.id, line]));
  const plans = items.map((item) => {
    let original = item.billLineId ? unused.get(Number(item.billLineId)) : [...unused.values()].find((line) => (line.stock_signature || signature(oldToInput(line))) === signature(item));
    if (item.billLineId && !original) invalid('An edited line does not belong to this invoice. Reload the invoice.');
    if (original) unused.delete(original.id);
    const compatible = original && original.item_type === item.itemType && Number(original.item_id) === Number(item.itemId || item.id);
    const exact = compatible && (original.stock_signature || signature(oldToInput(original))) === signature(item);
    const reqs = exact ? savedRequirements(original, products) : requirements(item, compatible ? original : null, products);
    if (item.itemType === 'product') {
      const product = products.get(Number(item.itemId || item.id));
      if (item.barcode && item.barcode !== product.barcode && !(compatible && original.barcode === item.barcode)) invalid('The selected barcode does not match this product. Refresh the catalog.');
    }
    return { item, original, compatible, exact, reqs, retained: [], released: [], pending: new Map() };
  });
  for (const plan of plans) if (!plan.exact && plan.compatible && !plan.original.cost_allocations) {
    // Old sales lack lot references. Record an unknown-cost basis without adding physical stock.
    plan.original.cost_allocations = [];
    for (const r of savedRequirements(plan.original, products)) {
      if (D(r.baseQty).eq(0)) continue;
      const [lot] = await InventoryLot.findOrCreate({ where: { source_key: `legacy-basis:${plan.original.id}:${r.productId}:${r.unit}` }, defaults: {
        product_id: r.productId, location_id: bill.outlet_id, remaining_qty: 0, unit_cost: null, received_at: plan.original.createdAt || new Date(),
      }, transaction });
      plan.original.cost_allocations.push({ productId: r.productId, locationId: bill.outlet_id, lotId: lot.id, qty: r.baseQty, unitCost: null });
    }
  }
  for (const plan of plans) {
    const need = new Map();
    for (const r of plan.reqs) need.set(r.productId, D(need.get(r.productId) || 0).plus(r.baseQty));
    if (plan.exact) { plan.retained = plan.original.cost_allocations; continue; }
    for (const allocation of plan.original?.cost_allocations || []) {
      const wanted = plan.compatible ? need.get(Number(allocation.productId)) || D(0) : D(0);
      const keep = Decimal.min(wanted, D(allocation.qty));
      if (keep.gt(0)) plan.retained.push({ ...allocation, qty: keep.toFixed(4) });
      const released = D(allocation.qty).minus(keep);
      if (released.gt(0)) plan.released.push({ ...allocation, qty: released.toFixed(4) });
      need.set(Number(allocation.productId), Decimal.max(0, wanted.minus(keep)));
    }
    plan.pending = need;
  }
  // Release only removed quantities. Original sold units retain their saved cost basis.
  const releaseLine = async (line, allocations) => {
    if (allocations) return restore(allocations, products, `bill:${bill.id}:reverse:${line.id}`, transaction);
    for (const r of savedRequirements(line, products)) {
      if (D(r.baseQty).eq(0)) continue;
      const product = products.get(Number(r.productId));
      await addLot({ productId: product.id, locationId: bill.outlet_id, quantity: r.baseQty, source: `legacy-reversal:${line.id}:${product.id}:${Math.random()}` }, transaction);
      await changeBalance(product, bill.outlet_id, r.baseQty, transaction);
    }
  };
  for (const line of unused.values()) await releaseLine(line, line.cost_allocations);
  for (const plan of plans) if (!plan.exact && plan.original) {
    if (plan.original.cost_allocations) await releaseLine(plan.original, plan.released);
    else await releaseLine(plan.original, null);
  }
  const allowNegative = process.env.ALLOW_NEGATIVE_STOCK === 'true' || options.allowNegative === true;
  const records = [];
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i], item = plan.item;
    let allocations = plan.retained;
    if (!plan.exact) for (const [productId, needed] of plan.pending) {
      if (needed.lte(0)) continue;
      const product = products.get(Number(productId));
      if (product.status !== 'active') invalid(`${product.item_name} is inactive.`);
      allocations.push(...await consume(product, bill.outlet_id, needed, `bill:${bill.id}:line:${i}`, transaction, allowNegative));
    }
    const known = allocations?.every((a) => a.unitCost !== null) ?? false;
    const totalCost = known ? money(allocations.reduce((sum, a) => sum.plus(D(a.qty).times(a.unitCost)), D(0))).toFixed(2) : null;
    const product = item.itemType === 'product' ? products.get(Number(item.itemId || item.id)) : null;
    records.push({ bill_id: bill.id, item_id: item.itemId || item.id, item_type: item.itemType,
      item_name: item.itemName, qty: qty(item.qty).toFixed(4), price: numeric(item.price, 'Selling price').toFixed(6),
      staff_assigned: item.staffAssigned || null, staff_ids: Array.isArray(item.staffIds) ? [...new Set(item.staffIds.map(String))] : null,
      barcode: product ? plan.compatible ? plan.original.barcode : product.barcode : null,
      base_qty: product ? plan.reqs.reduce((sum, r) => sum.plus(r.baseQty), D(0)).toFixed(4) : null,
      cost_total: totalCost, cost_allocations: allocations, stock_requirements: plan.reqs, stock_signature: signature(item),
      product_consumption: product ? { unit: item.unit || item.productConsumption?.unit || 'primary', abbr: item.unitAbbr || item.productConsumption?.abbr } : item.productConsumption || null,
      included_services: item.includedServices || null,
    });
  }
  await BillLineItem.destroy({ where: { bill_id: bill.id }, transaction });
  return BillLineItem.bulkCreate(records, { transaction });
}
async function receivePurchase(item, transaction) {
  const products = await lockProducts([item.product_id], transaction);
  const product = products.get(Number(item.product_id));
  const source = `po-item:${item.id}`;
  if (await InventoryLot.findOne({ where: { source_key: source }, transaction })) return;
  await addLot({ productId: product.id, quantity: item.qty, unitCost: item.unit_price, source }, transaction);
  await changeBalance(product, 0, item.qty, transaction);
}
async function transfer(product, outletId, quantity, issueId, transaction) {
  const allocations = await consume(product, 0, quantity, `issue:${issueId}:out`, transaction);
  for (const a of allocations) await addLot({ productId: product.id, locationId: outletId, quantity: a.qty, unitCost: a.unitCost,
    source: `issue:${issueId}:lot:${a.lotId}`, receivedAt: (await InventoryLot.findByPk(a.lotId, { transaction })).received_at }, transaction);
  await changeBalance(product, outletId, quantity, transaction);
}
async function adjustOpening(product, delta, unitCost, transaction) {
  if (D(delta).gt(0)) {
    await addLot({ productId: product.id, quantity: delta, unitCost, source: `opening-adjust:${product.id}:${Date.now()}:${Math.random()}` }, transaction);
    await changeBalance(product, 0, delta, transaction);
  } else if (D(delta).lt(0)) {
    const openingLots = await InventoryLot.findAll({ where: { product_id: product.id, location_id: 0,
      [Op.or]: [{ source_key: { [Op.like]: 'opening:%' } }, { source_key: { [Op.like]: 'opening-adjust:%' } }] }, transaction });
    await consume(product, 0, D(delta).neg(), `opening-adjust:${product.id}`, transaction, false, openingLots.map((lot) => lot.id));
  }
  if (unitCost !== null && unitCost !== undefined) {
    // Explicit opening-cost input values remaining opening stock, including transferred legacy stock.
    const unknown = await InventoryLot.findAll({ where: { product_id: product.id, unit_cost: null }, transaction, lock: transaction.LOCK.UPDATE });
    const openingIds = new Set(unknown.filter((lot) => lot.source_key.startsWith('opening:') || lot.source_key.startsWith('opening-adjust:')).map((lot) => lot.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const lot of unknown) {
        const parentId = Number(lot.source_key.match(/:lot:(\d+)$/)?.[1]);
        if (openingIds.has(parentId) && !openingIds.has(lot.id)) { openingIds.add(lot.id); changed = true; }
      }
    }
    for (const lot of unknown) if (openingIds.has(lot.id)) await lot.update({ unit_cost: unitCost }, { transaction });
  }
}
function saleSnapshot(line) { return { barcode: line.barcode, baseQty: line.base_qty === null ? null : Number(line.base_qty) }; }
module.exports = { D, qty, money, positive, baseQuantity, signature, lockProducts, addLot, consume, changeBalance, applyBillLines, receivePurchase, transfer, adjustOpening, saleSnapshot, invalid, numeric, validateLines };
