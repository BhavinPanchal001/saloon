const { Bill, Expense, Payment, PaymentDetail, OutletInventory, Product } = require('../models');
const { Op, fn, col } = require('sequelize');

// GET /api/reports/shift-end?outletId=&date=
const getShiftEndReport = async (req, res) => {
  try {
    const { outletId, date } = req.query;
    if (!outletId) {
      return res.status(400).json({ message: 'outletId is required.' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    // Fetch all bills for outlet on target date
    const bills = await Bill.findAll({
      where: {
        outlet_id: outletId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      include: [
        {
          model: Payment,
          as: 'payments',
          include: [{ model: PaymentDetail, as: 'details' }],
        },
      ],
    });

    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let totalNetSales = 0;
    const paymentBreakdown = { Cash: 0, Card: 0, UPI: 0, 'Store Credit': 0, Split: 0, Unpaid: 0 };

    const modeKeyMap = { cash: 'Cash', card: 'Card', upi: 'UPI', store_credit: 'Store Credit', bank_transfer: 'Card', cheque: 'Card' };

    bills.forEach((bill) => {
      totalGrossSales += Number(bill.subtotal);
      totalDiscounts += Number(bill.discount_amount || 0);
      totalTax += Number(bill.tax || 0);
      totalNetSales += Number(bill.total);

      let billPaidTotal = 0;
      (bill.payments || []).forEach((p) => {
        (p.details || []).forEach((d) => {
          const amt = Number(d.amount || 0);
          billPaidTotal += amt;
          const modeKey = modeKeyMap[d.payment_mode] || 'Cash';
          if (paymentBreakdown[modeKey] !== undefined) {
            paymentBreakdown[modeKey] += amt;
          }
        });
      });

      if (billPaidTotal === 0 && bill.status === 'paid') {
        if (bill.payment_method && paymentBreakdown[bill.payment_method] !== undefined) {
          paymentBreakdown[bill.payment_method] += Number(bill.total);
        }
      } else if (billPaidTotal < Number(bill.total || 0)) {
        paymentBreakdown.Unpaid += Number(bill.total || 0) - billPaidTotal;
      }
    });

    // Fetch cash expenses paid on this date for this outlet
    const expenses = await Expense.findAll({
      where: {
        outlet_id: outletId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
    });

    const totalCashExpenses = expenses.reduce((acc, exp) => acc + Number(exp.total_amount), 0);

    return res.json({
      date: targetDate,
      outletId: Number(outletId),
      totalBillsCount: bills.length,
      totalGrossSales,
      totalDiscounts,
      totalTax,
      totalNetSales,
      paymentBreakdown,
      totalCashExpenses,
      expectedCashInDrawer: paymentBreakdown.Cash - totalCashExpenses,
    });
  } catch (err) {
    console.error('Error generating shift end report:', err);
    return res.status(500).json({ message: 'Server error generating shift end report.' });
  }
};

// GET /api/reports/profit-loss?outletId=&startDate=&endDate=
const getProfitAndLossReport = async (req, res) => {
  try {
    const { outletId, startDate, endDate } = req.query;

    const whereBill = { status: 'paid' };
    const whereExpense = {};

    if (outletId) {
      whereBill.outlet_id = outletId;
      whereExpense.outlet_id = outletId;
    }

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      whereBill.createdAt = { [Op.between]: [start, end] };
      whereExpense.createdAt = { [Op.between]: [start, end] };
    }

    // Revenue
    const bills = await Bill.findAll({ where: whereBill });
    let grossRevenue = 0;
    let totalDiscount = 0;
    let taxCollected = 0;

    bills.forEach((b) => {
      grossRevenue += Number(b.subtotal);
      totalDiscount += Number(b.discount_amount || 0);
      taxCollected += Number(b.tax || 0);
    });

    const netRevenue = grossRevenue - totalDiscount;

    // Expenses
    const expenses = await Expense.findAll({ where: whereExpense });
    let totalExpenses = 0;
    const expensesByCategory = {};

    expenses.forEach((exp) => {
      const amt = Number(exp.total_amount);
      totalExpenses += amt;
      const cat = exp.item_name || 'General';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
    });

    const netProfit = netRevenue - totalExpenses;
    const profitMarginPercent = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(2) : 0;

    return res.json({
      startDate: startDate || null,
      endDate: endDate || null,
      grossRevenue,
      totalDiscount,
      netRevenue,
      taxCollected,
      totalExpenses,
      expensesByCategory,
      netProfit,
      profitMarginPercent: Number(profitMarginPercent),
    });
  } catch (err) {
    console.error('Error generating profit and loss report:', err);
    return res.status(500).json({ message: 'Server error generating P&L report.' });
  }
};

// GET /api/reports/customer-credit
const getCustomerCreditReport = async (req, res) => {
  try {
    const { Customer } = require('../models');
    const customers = await Customer.findAll({
      attributes: ['id', 'name', 'phone', 'email', 'credit_balance', 'updatedAt'],
      order: [['credit_balance', 'ASC']],
    });

    let totalStoreCredit = 0;
    let totalOutstandingDues = 0;
    let customersWithCreditCount = 0;
    let customersWithDueCount = 0;

    const customersWithBalance = customers.filter((c) => {
      const bal = Number(c.credit_balance || 0);
      if (bal > 0) {
        totalStoreCredit += bal;
        customersWithCreditCount++;
        return true;
      } else if (bal < 0) {
        totalOutstandingDues += Math.abs(bal);
        customersWithDueCount++;
        return true;
      }
      return false;
    });

    return res.json({
      totalStoreCredit,
      totalOutstandingDues,
      customersWithCreditCount,
      customersWithDueCount,
      customers: customersWithBalance.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        creditBalance: Number(c.credit_balance || 0),
        status: Number(c.credit_balance) > 0 ? 'Store Credit' : 'Outstanding Due',
      })),
    });
  } catch (err) {
    console.error('Error generating customer credit report:', err);
    return res.status(500).json({ message: 'Server error generating customer credit report.' });
  }
};

module.exports = {
  getShiftEndReport,
  getProfitAndLossReport,
  getCustomerCreditReport,
};

