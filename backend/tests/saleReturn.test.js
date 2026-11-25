const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planReturn, refundPayments, storeCreditDebits } = require('../src/services/saleReturnService');
const { buildProfitData } = require('../src/services/profitReportService');
const { businessDate } = require('../src/utils/reportDates');

test('successive product returns reconcile discounts, tax, and points to the original sale', () => {
  const bill = {
    subtotal: '1.00', total: '0.71', tax: '0.07', points_earned: 2, points_redeemed: 1,
    lineItems: [{ id: 1, item_type: 'product', qty: '3.0000', price: '0.333333' }],
  };
  const history = [];
  const plans = [];
  for (let i = 0; i < 3; i++) {
    const items = [{ lineId: 1, quantity: '1.0000' }];
    plans.push(planReturn(bill, history, items));
    history.push({ return_details: { items } });
  }
  assert.deepEqual(plans.map(plan => plan.amount.toFixed(2)), ['0.23', '0.25', '0.23']);
  assert.deepEqual(plans.map(plan => plan.tax.toFixed(2)), ['0.02', '0.03', '0.02']);
  assert.equal(plans.reduce((sum, plan) => sum + plan.earnedPoints, 0), 2);
  assert.equal(plans.reduce((sum, plan) => sum + plan.redeemedPoints, 0), 1);
  assert.equal(plans[2].fullReturn, true);
  assert.throws(() => planReturn(bill, history, [{ lineId: 1, quantity: 1 }]), { status: 409 });
});

test('only distinct retail lines on the invoice are returnable', () => {
  const bill = { lineItems: [{ id: 1, item_type: 'product', qty: 2 }, { id: 2, item_type: 'service', qty: 1 }] };
  assert.throws(() => planReturn(bill, [], [{ lineId: 2, quantity: 1 }]), { status: 400 });
  assert.throws(() => planReturn(bill, [], [{ lineId: 99, quantity: 1 }]), { status: 400 });
  assert.throws(() => planReturn(bill, [], [{ lineId: 1, quantity: 1 }, { lineId: 1, quantity: 1 }]), { status: 400 });
  assert.throws(() => planReturn(bill, [], [{ lineId: 1, quantity: '1.00001' }]), /four decimal places/);
});

test('split refunds stay within the balance of each original payment method', () => {
  const { amount } = planReturn({
    subtotal: 100, total: 100, lineItems: [{ id: 1, item_type: 'product', qty: 2, price: 50 }],
  }, [], [{ lineId: 1, quantity: 1 }]);
  const bill = { payments: [{ status: 'completed', details: [
    { payment_mode: 'cash', amount: 30 }, { payment_mode: 'upi', bank_account_id: 7, amount: 70 },
  ] }] };
  const prior = { payments: [{ details: [{ payment_mode: 'cash', amount: -30 }] }] };
  assert.deepEqual(refundPayments(bill, [prior], amount), [{ paymentMode: 'upi', bankAccountId: 7, amount: '50.00' }]);
  assert.throws(() => refundPayments({ payment_method: 'Cash', total: 50, payments: [{ status: 'failed', details: [] }] }, [], amount), { status: 409 });
  assert.throws(() => refundPayments({ payment_method: 'Cash', total: 50, payments: [{ status: 'completed', details: [], total_amount: 20 }] }, [], amount), { status: 409 });
});

test('return products and discounts reduce net profit report totals', () => {
  const line = { item_id: 1, item_name: 'Shampoo', item_type: 'product', qty: 1, price: 100, cost_total: 40 };
  const sale = { subtotal: 100, discount_amount: 15, voucher_discount_amount: 5, tax: 8, lineItems: [line] };
  const returned = { original_bill_id: 1, subtotal: -100, discount_amount: -20, tax: -8, lineItems: [{ ...line, qty: -1, cost_total: -40 }] };
  const report = buildProfitData([sale, returned], []);
  assert.equal(report.netRevenue, 0);
  assert.equal(report.knownCostOfGoodsSold, 0);
  assert.equal(report.taxCollected, 0);
  assert.equal(report.productSales[1].netRevenue, -80);
});

test('separate fractional SKU returns reverse the exact sales cents assigned to each product', () => {
  const bill = {
    subtotal: '0.67', total: '0.67', discount_amount: 0, tax: 0,
    lineItems: [
      { id: 2, item_id: 2, item_type: 'product', qty: 1, price: '0.333333', cost_total: 0 },
      { id: 1, item_id: 1, item_type: 'product', qty: 1, price: '0.333333', cost_total: 0 },
    ],
  };
  const history = [];
  for (const line of bill.lineItems) {
    const items = [{ lineId: line.id, quantity: 1 }];
    const plan = planReturn(bill, history, items);
    const returnLineId = line.id + 100;
    history.push({
      original_bill_id: 1, subtotal: plan.subtotal.neg(), discount_amount: plan.discount.neg(),
      return_details: { items: [{ ...items[0], returnLineId, netRevenue: plan.lines[0].net.toFixed(2) }] },
      lineItems: [{ ...line, id: returnLineId, qty: -1 }],
    });
  }
  assert.deepEqual(history.map(bill => bill.return_details.items[0].netRevenue), ['0.33', '0.34']);
  assert.deepEqual(buildProfitData([bill, ...history], []).productProfits.map(product => product.netRevenue), [0, 0]);
});

test('only verified store credit debits can fund a store credit refund', () => {
  const records = [
    { type: 'bill_payment', payment_method: 'Store Credit', notes: 'Bill #EXAMPLE payment via Store Credit', amount: 20 },
    { type: 'bill_payment', payment_method: 'Store Credit', notes: 'Payment of RM 5.00 collected for bill #EXAMPLE', amount: 5 },
    { type: 'adjustment', payment_method: 'Store Credit', notes: 'Store credit used on bill #EXAMPLE', amount: -15 },
    { type: 'adjustment', payment_method: 'Store Credit', notes: 'Store credit refunded on RET-1-1', amount: 20 },
    { type: 'settlement', payment_method: 'Store Credit', notes: 'Settled via Customer CRM', amount: 70 },
  ];
  assert.equal(storeCreditDebits('EXAMPLE', records).toFixed(2), '40.00');
  assert.equal(storeCreditDebits('OTHER', records).toFixed(2), '0.00');
});

test('the report date follows the business day at local midnight', () => {
  assert.equal(businessDate(new Date('2026-11-24T18:29:59Z'), 'Asia/Kolkata'), '2026-11-24');
  assert.equal(businessDate(new Date('2026-11-24T18:30:00Z'), 'Asia/Kolkata'), '2026-11-25');
});
