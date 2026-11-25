const { Bill, BillLineItem, Customer, CustomerLedger, CustomerVoucher, LoyaltyLedger, Payment, PaymentDetail, PosShift, PosTerminal, sequelize } = require('../models');
const costs = require('./inventoryCostService');
const { allocateSaleAmounts } = require('./profitReportService');
const { evaluateCustomerTier } = require('./rewardService');
const { checkoutHash } = require('../utils/checkoutRequest');
const updateLock = require('../utils/updateLock');
const { businessDate } = require('../utils/reportDates');
const { D, money } = costs;

const modeLabels = { cash: 'Cash', card: 'Card', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque', store_credit: 'Store Credit' };
const paymentInclude = { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] };
const adminRoles = ['admin', 'super_admin'];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

async function getReturns(billId, options = {}) {
  return Bill.findAll({ where: { original_bill_id: billId }, order: [['id', 'ASC']], ...options });
}

function returnedQuantities(returns) {
  const quantities = new Map();
  for (const bill of returns) {
    for (const item of bill.return_details.items) {
      quantities.set(item.lineId, D(quantities.get(item.lineId)).plus(item.quantity));
    }
  }
  return quantities;
}

function refundPayments(bill, returns, amount) {
  const available = new Map();
  function add(mode, bank, value) {
    const key = `${mode}:${bank || ''}`;
    const entry = available.get(key) || { paymentMode: mode, bankAccountId: bank || null, remaining: D(0) };
    entry.remaining = entry.remaining.plus(value);
    available.set(key, entry);
  }
  for (const payment of bill.payments.filter(p => p.status === 'completed')) {
    for (const detail of payment.details) add(detail.payment_mode, detail.bank_account_id, detail.amount);
  }
  if (available.size === 0 && bill.payments.every(payment => payment.status === 'completed' && !payment.details.length)) {
    const legacyMethod = String(bill.payment_method || '').toLowerCase();
    const legacyMode = legacyMethod === 'bank' ? 'bank_transfer'
      : Object.keys(modeLabels).find(mode => modeLabels[mode].toLowerCase() === legacyMethod);
    const recordedTotal = bill.payments.reduce((sum, payment) => sum.plus(payment.total_amount), D(0));
    const legacyAmount = bill.payments.length ? recordedTotal : D(bill.total);
    if (legacyMode && legacyAmount.gt(0)) add(legacyMode, legacyMode === 'cash' ? null : bill.bank_id, legacyAmount);
  }
  for (const refund of returns) {
    for (const payment of refund.payments) {
      for (const detail of payment.details) add(detail.payment_mode, detail.bank_account_id, detail.amount);
    }
  }
  // Use the original tenders in payment order, up to the remaining amount paid on each.
  const refunds = [];
  let left = amount;
  for (const { paymentMode, bankAccountId, remaining } of available.values()) {
    if (left.lte(0)) break;
    if (remaining.lte(0)) continue;
    const refund = left.lt(remaining) ? left : remaining;
    refunds.push({ paymentMode, bankAccountId, amount: refund.toFixed(2) });
    left = left.minus(refund);
  }
  if (left.gt(0)) fail('The original invoice has insufficient recorded payments for this refund.', 409);
  return refunds;
}

function storeCreditDebits(billNumber, records) {
  return records.reduce((sum, row) => {
    if (row.payment_method !== 'Store Credit') return sum;
    if (row.type === 'adjustment' && row.notes === `Store credit used on bill #${billNumber}` && D(row.amount).lt(0)) {
      return sum.minus(row.amount);
    }
    if (row.type === 'bill_payment' && (row.notes === `Bill #${billNumber} payment via Store Credit`
      || (/^Payment of RM /.test(row.notes || '') && row.notes.endsWith(` collected for bill #${billNumber}`)))) {
      return sum.plus(row.amount);
    }
    return sum;
  }, D(0));
}

async function verifyStoreCredit(bill, history, refunds, transaction) {
  const requested = refunds.filter(payment => payment.paymentMode === 'store_credit').reduce((sum, row) => sum.plus(row.amount), D(0));
  if (requested.isZero()) return;
  const records = bill.customer_id ? await CustomerLedger.findAll({
    where: { bill_id: bill.id, customer_id: bill.customer_id, payment_method: 'Store Credit' }, transaction,
  }) : [];
  const refunded = history.flatMap(record => record.payments).flatMap(payment => payment.details)
    .filter(detail => detail.payment_mode === 'store_credit').reduce((sum, detail) => sum.minus(detail.amount), D(0));
  if (storeCreditDebits(bill.bill_number, records).lt(requested.plus(refunded))) {
    fail('The customer ledger cannot verify the store credit used on this invoice.', 409);
  }
}

function planReturn(bill, history, items) {
  if (!Array.isArray(items) || !items.length) fail('Select at least one product to return.');
  const previous = returnedQuantities(history);
  const sourceLines = [...bill.lineItems].sort((a, b) => a.id - b.id);
  const byId = new Map(sourceLines.map(line => [Number(line.id), line]));
  const selected = new Map();
  for (const item of items) {
    const id = Number(item?.lineId);
    const line = byId.get(id);
    if (line?.item_type !== 'product' || selected.has(id)) fail('Select each product line only once.');
    const quantity = costs.positive(item.quantity);
    if (!quantity.eq(D(item.quantity))) fail('Return quantities can have up to four decimal places.');
    if (quantity.plus(D(previous.get(id))).gt(line.qty)) fail(`Only ${D(line.qty).minus(D(previous.get(id)))} of ${line.item_name} remains returnable.`, 409);
    selected.set(id, quantity);
  }

  const invoiceSubtotal = D(bill.subtotal);
  const invoiceTax = D(bill.tax);
  const invoiceDiscount = invoiceSubtotal.plus(invoiceTax).minus(bill.total);
  if (invoiceSubtotal.lt(0) || invoiceTax.lt(0) || invoiceDiscount.lt(0) || invoiceDiscount.gt(invoiceSubtotal)) {
    fail('The original invoice totals do not reconcile.', 409);
  }
  const saleAmounts = allocateSaleAmounts(sourceLines, invoiceDiscount, invoiceSubtotal);
  const weights = sourceLines.map(line => invoiceSubtotal.gt(0) ? D(line.qty).times(line.price) : D(line.qty));
  const totalWeight = weights.reduce((sum, value) => sum.plus(value), D(0));
  const taxWeights = totalWeight.gt(0) ? weights : sourceLines.map(line => D(line.qty));
  const weightTotal = taxWeights.reduce((sum, value) => sum.plus(value), D(0));
  const prorate = (value, before, after, round = money) => round(D(value).times(after)).minus(round(D(value).times(before)));
  let offset = D(0);
  let previousWeight = D(0);
  let returnedWeight = D(0);
  const lines = [];
  sourceLines.forEach((line, index) => {
    const weight = taxWeights[index];
    const lineEnd = offset.plus(weight);
    const lineTax = prorate(invoiceTax, offset.div(weightTotal), lineEnd.div(weightTotal));
    offset = lineEnd;
    const id = Number(line.id);
    const originalQty = D(line.qty);
    if (!originalQty.gt(0)) return;
    const previousQty = D(previous.get(id));
    const quantity = D(selected.get(id));
    const before = previousQty.div(originalQty);
    const after = previousQty.plus(quantity).div(originalQty);
    previousWeight = previousWeight.plus(weight.times(before));
    returnedWeight = returnedWeight.plus(weight.times(after));
    if (!quantity.gt(0)) return;
    const invoiceLine = saleAmounts[index];
    const net = prorate(invoiceLine.gross.minus(invoiceLine.discount), before, after);
    const discount = prorate(invoiceLine.discount, before, after);
    const tax = prorate(lineTax, before, after);
    lines.push({ line, quantity, previousQty, net, discount, tax });
  });
  const sum = field => lines.reduce((total, line) => total.plus(line[field]), D(0));
  const net = sum('net');
  const discount = sum('discount');
  const tax = sum('tax');
  const fullReturn = sourceLines.every(line => D(previous.get(Number(line.id))).plus(D(selected.get(Number(line.id)))).eq(line.qty));
  const points = value => prorate(value, previousWeight.div(weightTotal), fullReturn ? D(1) : returnedWeight.div(weightTotal), n => n.floor()).toNumber();
  return {
    lines, subtotal: net.plus(discount), tax, amount: net.plus(tax), fullReturn, discount,
    earnedPoints: points(bill.points_earned),
    redeemedPoints: points(bill.points_redeemed),
  };
}

function canReturnBill(bill, user) {
  return adminRoles.includes(user.role) || (
    (!user.outlet_id || Number(user.outlet_id) === Number(bill.outlet_id)) &&
    (!['cashier', 'pos'].includes(user.role) || Number(bill.created_by) === Number(user.id))
  );
}

async function adjustCustomer(original, creditNote, plan, refunds, user, transaction) {
  const credit = refunds.filter(p => p.paymentMode === 'store_credit').reduce((sum, p) => sum.plus(p.amount), D(0));
  const customer = original.customer_id && await Customer.findByPk(original.customer_id, updateLock(transaction));
  if (!customer && credit.gt(0)) fail('Store credit requires an active customer record.', 409);
  if (customer) {
    const points = plan.redeemedPoints - plan.earnedPoints;
    const creditBalance = D(customer.credit_balance).plus(credit);
    // Points already spent remain a negative balance until future purchases earn them back.
    const pointsBalance = Number(customer.loyalty_points || 0) + points;
    await customer.update({
      credit_balance: creditBalance.toFixed(2),
      loyalty_points: pointsBalance,
      total_spend: D(customer.total_spend).minus(plan.amount).clamp(0, Infinity).toFixed(2),
      total_visits: Math.max(0, Number(customer.total_visits || 0) - Number(plan.fullReturn)),
    }, { transaction });
    if (credit.gt(0)) await CustomerLedger.create({
      customer_id: customer.id, bill_id: creditNote.id, type: 'adjustment', amount: credit.toFixed(2),
      balance_after: creditBalance.toFixed(2), payment_method: 'Store Credit',
      notes: `Store credit refunded on ${creditNote.bill_number}`, created_by: String(user.id),
    }, { transaction });
    if (points) await LoyaltyLedger.create({
      customer_id: customer.id, bill_id: creditNote.id, type: 'refunded', points, balance_after: pointsBalance,
      notes: `Loyalty adjustment for ${creditNote.bill_number}`, created_by: String(user.id),
    }, { transaction });
    await evaluateCustomerTier(customer, transaction);
  }
}

async function saleReturn({ billId, user, body, preview }) {
  const { items, quoteKey, requestKey, reason, reference } = body;
  const cleanReason = typeof reason === 'string' ? reason.trim() : '';
  const cleanReference = typeof reference === 'string' ? reference.trim() : '';
  if (!preview && (!cleanReason || cleanReason.length > 500 || cleanReference.length > 100)) {
    fail('Enter a reason of up to 500 characters and an optional refund reference of up to 100 characters.');
  }
  if (!preview && (typeof requestKey !== 'string' || !/^[a-z0-9-]{16,52}$/i.test(requestKey))) fail('A valid return request key is required.');
  const requestHash = checkoutHash({ billId, items, cleanReason, cleanReference, quoteKey });
  const storedKey = `return:${checkoutHash({ billId, requestKey }).slice(0, 57)}`;
  return sequelize.transaction(async transaction => {
    const original = await Bill.findByPk(billId, updateLock(transaction));
    if (!original) fail('Original invoice not found.', 404);
    if (!canReturnBill(original, user)) fail('You cannot return products from this invoice.', 403);
    if (original.original_bill_id || !['paid', 'completed'].includes(original.status)) fail('Choose a fully paid sale invoice.', 409);
    if (!preview) {
      const existing = await Bill.findOne({ where: { request_key: storedKey }, transaction });
      if (existing) {
        if (existing.request_hash !== requestHash) fail('This return request has already been used.', 409);
        return { id: existing.id, billNumber: existing.bill_number };
      }
    }

    const bill = await Bill.findByPk(original.id, { include: [{ model: BillLineItem, as: 'lineItems' }, paymentInclude], transaction });
    bill.payments.sort((a, b) => a.id - b.id);
    for (const payment of bill.payments) payment.details.sort((a, b) => a.id - b.id);
    const history = await getReturns(bill.id, { include: [paymentInclude], transaction });
    const plan = planReturn(bill, history, items);
    const recordedAmount = history.reduce((sum, entry) => sum.minus(entry.total), D(0));
    if (recordedAmount.plus(plan.amount).gt(bill.total)) fail('This refund exceeds the remaining invoice total.', 409);
    const refunds = refundPayments(bill, history, plan.amount);
    await verifyStoreCredit(bill, history, refunds, transaction);
    let shift = null;
    if (refunds.length) {
      shift = await PosShift.findOne({
        where: { outlet_id: bill.outlet_id, user_id: user.id, status: 'OPEN' },
        order: [['id', 'DESC']], ...updateLock(transaction),
      });
      if (!shift && bill.pos_shift_id && refunds.some(p => p.paymentMode === 'cash')) fail('Open a POS shift at this outlet to record a cash refund.', 409);
    }
    const returnItems = plan.lines.map(({ line, quantity, previousQty, net }) => ({
      lineId: Number(line.id), quantity: quantity.toFixed(4), previousQty: previousQty.toFixed(4), netRevenue: net.toFixed(2),
    }));
    const terminal = shift && await PosTerminal.findByPk(shift.pos_terminal_id, { attributes: ['name'], transaction });
    const quote = {
      terminalName: terminal?.name || null,
      amount: plan.amount.toFixed(2),
      refunds: refunds.map(payment => ({ ...payment, label: modeLabels[payment.paymentMode] })),
    };
    const currentQuoteKey = checkoutHash({
      billId, updatedAt: bill.updatedAt?.toISOString(), returnItems, quote, shiftId: shift?.id,
    });
    if (preview) return { ...quote, quoteKey: currentQuoteKey };
    if (quoteKey !== currentQuoteKey) fail('This return changed. Review the updated refund before recording it.', 409);

    // Checkout takes a voucher lock before stock and customer locks.
    if (plan.fullReturn && bill.awarded_voucher_id) {
      await CustomerVoucher.update({ status: 'cancelled' }, {
        where: { id: bill.awarded_voucher_id, status: 'active', redeemed_at: null }, transaction,
      });
    }
    const products = await costs.lockProducts(plan.lines.map(({ line }) => line.item_id), transaction);
    const creditNote = await Bill.create({
      original_bill_id: bill.id, bill_number: `RET-${bill.id}-${history.length + 1}`,
      request_key: storedKey, request_hash: requestHash,
      outlet_id: bill.outlet_id, customer_id: bill.customer_id,
      customer_name: bill.customer_name, customer_phone: bill.customer_phone,
      created_by: user.id, pos_shift_id: shift?.id, pos_terminal_id: shift?.pos_terminal_id,
      status: 'paid', payment_method: refunds.length > 1 ? 'Split' : modeLabels[refunds[0]?.paymentMode] || 'No Refund',
      subtotal: plan.subtotal.neg().toFixed(2), tax: plan.tax.neg().toFixed(2),
      discount_amount: plan.discount.neg().toFixed(2), total: plan.amount.neg().toFixed(2),
      points_earned: -plan.earnedPoints, points_redeemed: -plan.redeemedPoints,
    }, { transaction });

    const recordedItems = [];
    for (const [index, { line, quantity, previousQty }] of plan.lines.entries()) {
      const stock = await costs.restockReturnedProduct({
        bill, line, previousQty, returnedQty: quantity, products, reference: `return:${creditNote.id}:line:${line.id}`,
      }, transaction);
      const returnLine = await BillLineItem.create({
        bill_id: creditNote.id, item_id: line.item_id, item_type: line.item_type, item_name: line.item_name,
        qty: quantity.neg().toFixed(4), price: line.price, barcode: line.barcode,
        product_consumption: line.product_consumption, ...stock,
      }, { transaction });
      recordedItems.push({ ...returnItems[index], returnLineId: returnLine.id });
    }
    await creditNote.update({ return_details: { reason: cleanReason, reference: cleanReference, items: recordedItems } }, { transaction });
    if (refunds.length) {
      const payment = await Payment.create({
        bill_id: creditNote.id, status: 'refunded', total_amount: plan.amount.neg().toFixed(2),
        payment_date: businessDate(), transaction_reference: cleanReference || null,
      }, { transaction });
      await PaymentDetail.bulkCreate(refunds.map(refund => ({
        payment_id: payment.id, payment_mode: refund.paymentMode, bank_account_id: refund.bankAccountId,
        amount: D(refund.amount).neg().toFixed(2),
      })), { transaction });
    }
    await adjustCustomer(bill, creditNote, plan, refunds, user, transaction);
    return { id: creditNote.id, billNumber: creditNote.bill_number };
  });
}

async function guardReturnBill(bill, transaction) {
  if (bill.original_bill_id || await Bill.findOne({ where: { original_bill_id: bill.id }, attributes: ['id'], transaction })) {
    fail('Invoices with a recorded return and return records are locked.', 409);
  }
}

const returnSummary = bill => ({
  id: bill.id, billNumber: bill.bill_number, createdAt: bill.createdAt, amount: D(bill.total).neg().toNumber(),
  reason: bill.return_details.reason,
});

module.exports = { saleReturn, getReturns, returnedQuantities, guardReturnBill, returnSummary, canReturnBill, planReturn, refundPayments, storeCreditDebits };
