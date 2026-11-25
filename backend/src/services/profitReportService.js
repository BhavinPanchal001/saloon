const { reportRange } = require("../utils/reportDates");
const Decimal = require('decimal.js');
const { Op } = require('sequelize');
const { Bill, BillLineItem, Expense } = require('../models');
const D = (value) => new Decimal(value ?? 0);
const amount = (value) => Number(D(value).toDecimalPlaces(2));

// Allocate integer currency cents with deterministic residual reconciliation.
function allocateSaleAmounts(lines, discount, subtotal) {
  let rawGross = lines.map((line) => D(line.qty).times(line.price));
  let rawTotal = rawGross.reduce((a, b) => a.plus(b), D(0));
  if (subtotal != null && !rawTotal.toDecimalPlaces(2).eq(subtotal)) {
    const weights = rawTotal.gt(0) ? rawGross : lines.map(line => D(line.qty));
    const totalWeight = weights.reduce((sum, value) => sum.plus(value), D(0));
    rawGross = weights.map(weight => totalWeight.gt(0) ? D(subtotal).times(weight).div(totalWeight) : D(0));
    rawTotal = D(subtotal);
  }
  const gross = rawGross.map((value) => value.times(100).floor());
  let grossRemainder = rawTotal.times(100).toDecimalPlaces(0).minus(gross.reduce((a, b) => a.plus(b), D(0))).toNumber();
  for (let i = 0; grossRemainder > 0 && i < gross.length; i++) if (rawGross[i].gt(0)) { gross[i] = gross[i].plus(1); grossRemainder--; }
  const total = gross.reduce((a, b) => a.plus(b), D(0));
  const cents = Decimal.min(total, Decimal.max(0, D(discount).times(100).toDecimalPlaces(0)));
  let allocated = D(0);
  const shares = gross.map((value) => {
    const share = total.gt(0) ? cents.times(value).div(total).floor() : D(0);
    allocated = allocated.plus(share); return share;
  });
  let residual = cents.minus(allocated).toNumber();
  for (let i = 0; residual > 0 && i < shares.length; i++) {
    if (gross[i].gt(shares[i])) { shares[i] = shares[i].plus(1); residual--; }
  }
  return gross.map((value, i) => ({ gross: value.div(100), discount: shares[i].div(100) }));
}

function allocateDiscount(lines, discount) {
  return allocateSaleAmounts(lines, discount).map(line => amount(line.gross.minus(line.discount)));
}
function buildProfitData(bills, expenses) {
  let grossRevenue = D(0), totalDiscount = D(0), taxCollected = D(0), knownCost = D(0), unknownCostLines = 0;
  const productMap = new Map(), productSales = [];
  for (const bill of bills) {
    const lines = [...(bill.lineItems || [])].sort((a, b) => a.id - b.id);
    const discounts = D(bill.discount_amount).plus(bill.voucher_discount_amount || 0).plus(bill.points_discount_amount || 0);
    const isReturn = Boolean(bill.original_bill_id);
    const recordedNet = new Map((bill.return_details?.items || []).filter(item => item.returnLineId != null)
      .map(item => [Number(item.returnLineId), Number(item.netRevenue)]));
    const hasRecordedNet = isReturn && lines.every(line => recordedNet.has(Number(line.id)));
    const allocatedSales = hasRecordedNet ? lines.map(line => -recordedNet.get(Number(line.id))) : isReturn
      ? allocateDiscount(lines.map(line => ({ qty: D(line.qty).neg(), price: line.price })), discounts.neg()).map(value => -value)
      : allocateSaleAmounts(lines, discounts, bill.subtotal).map(line => amount(line.gross.minus(line.discount)));
    if (isReturn && !hasRecordedNet && allocatedSales.length) {
      const net = D(bill.subtotal).minus(discounts);
      const allocated = allocatedSales.reduce((sum, value) => sum.plus(value), D(0));
      allocatedSales[0] = amount(D(allocatedSales[0]).plus(net.minus(allocated)));
    }
    grossRevenue = grossRevenue.plus(bill.subtotal);
    totalDiscount = totalDiscount.plus(isReturn ? discounts : Decimal.min(D(bill.subtotal), discounts));
    taxCollected = taxCollected.plus(bill.tax || 0);
    lines.forEach((line, index) => {
      const hasMaterials = line.item_type === 'product' || (Array.isArray(line.product_consumption) && line.product_consumption.length > 0)
        || (line.included_services || []).some((svc) => svc.productConsumption?.length > 0);
      const known = line.cost_total !== null && line.cost_total !== undefined || !hasMaterials;
      const cost = known ? D(line.cost_total || 0) : (line.cost_allocations || []).reduce((sum, a) => sum.plus(a.unitCost === null ? 0 : D(a.qty).times(a.unitCost)), D(0));
      knownCost = knownCost.plus(cost);
      if (!known) unknownCostLines++;
      if (line.item_type !== 'product') return;
      const key = `${line.item_id}:${line.barcode || ''}`;
      const group = productMap.get(key) || { productId: line.item_id, name: line.item_name, barcode: line.barcode || null, qtySold: 0, netRevenue: 0, knownCost: 0, unknownCostLines: 0 };
      group.qtySold = Number(D(group.qtySold).plus(line.qty));
      group.netRevenue = amount(D(group.netRevenue).plus(allocatedSales[index] || 0));
      group.knownCost = amount(D(group.knownCost).plus(cost));
      if (!known) group.unknownCostLines++;
      productMap.set(key, group);
      productSales.push({ lineId: line.id, billId: bill.id, billNumber: bill.bill_number, createdAt: bill.createdAt, outletId: bill.outlet_id,
        productId: line.item_id, barcode: line.barcode, qty: Number(line.qty), netRevenue: allocatedSales[index], costTotal: known ? amount(cost) : null,
        grossProfit: known ? amount(D(allocatedSales[index]).minus(cost)) : null });
    });
  }
  const expensesByCategory = {};
  let totalExpenses = D(0);
  expenses.forEach((expense) => {
    totalExpenses = totalExpenses.plus(expense.total_amount);
    const name = expense.item_name || 'General';
    expensesByCategory[name] = amount(D(expensesByCategory[name]).plus(expense.total_amount));
  });
  const netRevenue = grossRevenue.minus(totalDiscount);
  const grossProfit = unknownCostLines ? null : amount(netRevenue.minus(knownCost));
  const netProfit = grossProfit === null ? null : amount(D(grossProfit).minus(totalExpenses));
  return { grossRevenue: amount(grossRevenue), totalDiscount: amount(totalDiscount), netRevenue: amount(netRevenue), taxCollected: amount(taxCollected),
    totalExpenses: amount(totalExpenses), expensesByCategory, knownCostOfGoodsSold: amount(knownCost),
    costOfGoodsSold: unknownCostLines ? null : amount(knownCost), grossProfit, netProfit,
    profitMarginPercent: netProfit === null ? null : netRevenue.gt(0) ? amount(D(netProfit).div(netRevenue).times(100)) : 0,
    unknownCostLines, costingComplete: unknownCostLines === 0,
    productProfits: [...productMap.values()].map((group) => {
      const costTotal = group.unknownCostLines ? null : group.knownCost;
      const grossProfit = costTotal === null ? null : amount(D(group.netRevenue).minus(costTotal));
      return { ...group, costTotal, grossProfit, marginPercent: grossProfit === null ? null : group.netRevenue > 0 ? amount(D(grossProfit).div(group.netRevenue).times(100)) : 0 };
    }).sort((a, b) => b.netRevenue - a.netRevenue), productSales };
}
async function getProfitData({ outletId, startDate, endDate } = {}) {
  // Revenue recognition follows sale/invoice date; unpaid sales also consumed stock.
  const where = { status: { [Op.in]: ['paid', 'completed', 'unpaid', 'partially_paid'] } }, expenseWhere = {};
  if (outletId) { where.outlet_id = outletId; expenseWhere.outlet_id = outletId; }
  const { range, timeZone } = reportRange({ startDate, endDate });
  if (startDate || endDate) { where.createdAt = range; expenseWhere.createdAt = range; }
  const [bills, expenses] = await Promise.all([
    Bill.findAll({ where, include: [{ model: BillLineItem, as: 'lineItems' }], order: [['id', 'ASC']] }),
    Expense.findAll({ where: expenseWhere }),
  ]);
  return { startDate: startDate || null, endDate: endDate || null, timeZone, ...buildProfitData(bills, expenses) };
}
module.exports = { allocateSaleAmounts, allocateDiscount, buildProfitData, getProfitData };
