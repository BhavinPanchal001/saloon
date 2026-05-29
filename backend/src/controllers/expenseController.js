const { Op } = require('sequelize');
const { Expense, MonthlyBudget, BudgetHistory, Outlet, Payment, PaymentDetail, Bank, sequelize } = require('../models');

// Helper to get current month key (YYYY-MM)
const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Get expenses with optional filters
const getExpenses = async (req, res) => {
  try {
    const { outletId, monthKey } = req.query;
    const targetMonth = monthKey || getCurrentMonthKey();

    const where = {
      month_key: targetMonth,
    };

    if (outletId) {
      where.outlet_id = outletId;
    }

    const expenses = await Expense.findAll({
      where,
      include: [
        {
          model: Outlet,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Payment,
          as: 'payments',
          include: [{ model: PaymentDetail, as: 'details' }],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Create new expense with budget validation
const createExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { item_name, qty, price, total_amount, bill_no, outlet_id, month_key, payment } = req.body;

    // Validation
    if (!item_name || !item_name.trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'item_name is required.' });
    }
    if (!price || Number(price) <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'price must be greater than 0.' });
    }
    if (!total_amount || Number(total_amount) <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'total_amount must be greater than 0.' });
    }
    if (!outlet_id) {
      await t.rollback();
      return res.status(400).json({ message: 'outlet_id is required.' });
    }

    const expenseMonth = month_key || getCurrentMonthKey();
    const expenseAmount = Number(total_amount);

    // Budget validation
    const budget = await MonthlyBudget.findOne({
      where: {
        outlet_id,
        month_key: expenseMonth,
      },
    });

    if (budget && budget.amount > 0) {
      // Calculate current expenses for this outlet/month
      const currentExpenses = await Expense.sum('total_amount', {
        where: {
          outlet_id,
          month_key: expenseMonth,
        },
      });

      const currentTotal = currentExpenses || 0;
      const remainingBudget = budget.amount - currentTotal;

      if (expenseAmount > remainingBudget) {
        await t.rollback();
        return res.status(400).json({
          message: `Expense amount (${expenseAmount}) exceeds remaining budget (${remainingBudget}) for this outlet in ${expenseMonth}. Please increase the budget or reduce the expense amount.`,
        });
      }
    }

    // Create expense
    const expense = await Expense.create({
      item_name: item_name.trim(),
      qty: qty ? Number(qty) : null,
      price: Number(price),
      total_amount: expenseAmount,
      bill_no: bill_no ? bill_no.trim() : null,
      outlet_id: Number(outlet_id),
      month_key: expenseMonth,
    }, { transaction: t });

    // Create payment if provided
    if (payment && Array.isArray(payment.details) && payment.details.length > 0) {
      const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
      let totalPaymentAmount = 0;
      const detailRows = payment.details.map((d) => {
        const amount = Math.max(0, Number(d.amount) || 0);
        totalPaymentAmount += amount;
        if (!validModes.includes(d.paymentMode)) {
          throw new Error(`Invalid payment mode: ${d.paymentMode}. Must be one of: ${validModes.join(', ')}`);
        }
        return { amount, payment_mode: d.paymentMode };
      });

      if (payment.bankAccountId) {
        const bank = await Bank.findByPk(payment.bankAccountId, { transaction: t });
        if (!bank) {
          await t.rollback();
          return res.status(400).json({ message: 'Selected bank account not found.' });
        }
      }

      if (totalPaymentAmount > 0) {
        const paymentStatus = totalPaymentAmount >= expenseAmount ? 'completed' : 'pending';
        const createdPayment = await Payment.create({
          expense_id: expense.id,
          purchase_order_id: null,
          pos_id: null,
          total_amount: totalPaymentAmount,
          status: payment.status || paymentStatus,
          transaction_reference: (payment.transactionReference || '').trim() || null,
          notes: (payment.notes || '').trim() || null,
          payment_date: payment.paymentDate || new Date().toISOString().split('T')[0],
          bank_account_id: payment.bankAccountId || null,
        }, { transaction: t });

        await PaymentDetail.bulkCreate(
          detailRows.map((row) => ({ ...row, payment_id: createdPayment.id })),
          { transaction: t }
        );
      }
    }

    await t.commit();

    // Return with outlet info and payments
    const expenseWithDetails = await Expense.findByPk(expense.id, {
      include: [
        {
          model: Outlet,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Payment,
          as: 'payments',
          include: [
            { model: PaymentDetail, as: 'details' },
            { model: Bank, as: 'bankAccount' },
          ],
          required: false,
        },
      ],
    });

    return res.status(201).json(expenseWithDetails);
  } catch (err) {
    await t.rollback();
    console.error('Error creating expense:', err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    await expense.destroy();
    return res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get budget summary
const getBudgetSummary = async (req, res) => {
  try {
    const { outletId, monthKey } = req.query;
    const targetMonth = monthKey || getCurrentMonthKey();

    // Get outlets to calculate budget for
    let targetOutlets;
    if (outletId) {
      const outlet = await Outlet.findByPk(outletId);
      if (!outlet) {
        return res.status(404).json({ message: 'Outlet not found.' });
      }
      targetOutlets = [outlet];
    } else {
      targetOutlets = await Outlet.findAll({
        where: { status: 'active' },
        order: [['name', 'ASC']],
      });
    }

    // Get budgets for target outlets
    const budgets = await MonthlyBudget.findAll({
      where: {
        outlet_id: targetOutlets.map((o) => o.id),
        month_key: targetMonth,
      },
    });

    // Calculate total monthly budget
    const totalMonthlyBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

    // Calculate total expenses so far
    const expensesWhere = {
      month_key: targetMonth,
    };
    if (outletId) {
      expensesWhere.outlet_id = outletId;
    }

    const totalExpensesSoFar = await Expense.sum('total_amount', {
      where: expensesWhere,
    }) || 0;

    const remainingBalance = totalMonthlyBudget - totalExpensesSoFar;
    const spendPercentage = totalMonthlyBudget > 0
      ? Math.round((totalExpensesSoFar / totalMonthlyBudget) * 100)
      : 0;

    // Per-outlet budget breakdown
    const outletBudgets = await Promise.all(
      targetOutlets.map(async (outlet) => {
        const budget = budgets.find((b) => b.outlet_id === outlet.id);
        const outletBudget = budget ? Number(budget.amount) : 0;

        const outletExpenses = await Expense.sum('total_amount', {
          where: {
            outlet_id: outlet.id,
            month_key: targetMonth,
          },
        }) || 0;

        const outletSpendPercentage = outletBudget > 0
          ? Math.round((outletExpenses / outletBudget) * 100)
          : 0;

        return {
          outletId: outlet.id,
          outletName: outlet.name,
          amount: outletBudget,
          spendPercentage: outletSpendPercentage,
          currentExpenses: outletExpenses,
          remainingBudget: outletBudget - outletExpenses,
        };
      })
    );

    return res.json({
      totalMonthlyBudget,
      totalExpensesSoFar,
      remainingBalance,
      spendPercentage,
      monthKey: targetMonth,
      budgets: outletBudgets,
    });
  } catch (err) {
    console.error('Error fetching budget summary:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Update monthly budget
const updateMonthlyBudget = async (req, res) => {
  try {
    const { outlet_id, amount, month_key, reason } = req.body;

    // Validation
    if (!outlet_id) {
      return res.status(400).json({ message: 'outlet_id is required.' });
    }
    if (amount === undefined || amount === null || Number(amount) < 0) {
      return res.status(400).json({ message: 'amount must be a non-negative number.' });
    }

    const targetMonth = month_key || getCurrentMonthKey();
    const newAmount = Number(amount);

    // Find existing budget
    let budget = await MonthlyBudget.findOne({
      where: {
        outlet_id,
        month_key: targetMonth,
      },
    });

    const previousAmount = budget ? Number(budget.amount) : 0;

    // Update or create budget
    if (budget) {
      await budget.update({ amount: newAmount });
    } else {
      budget = await MonthlyBudget.create({
        outlet_id: Number(outlet_id),
        month_key: targetMonth,
        amount: newAmount,
      });
    }

    // Log to history if amount changed
    if (previousAmount !== newAmount) {
      const changeAmount = Math.abs(newAmount - previousAmount);
      const changeType = newAmount > previousAmount ? 'increase' : 'decrease';

      await BudgetHistory.create({
        outlet_id: Number(outlet_id),
        month_key: targetMonth,
        previous_amount: previousAmount,
        new_amount: newAmount,
        change_amount: changeAmount,
        change_type: changeType,
        reason: reason || `Budget ${changeType}d`,
        changed_by: req.user?.id || null,
        changed_at: new Date(),
      });
    }

    // Return updated budget summary
    return getBudgetSummary(
      { query: { outletId: outlet_id, monthKey: targetMonth }, user: req.user },
      res
    );
  } catch (err) {
    console.error('Error updating monthly budget:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get budget history
const getBudgetHistory = async (req, res) => {
  try {
    const { outletId, monthKey, limit = 50 } = req.query;

    const where = {};
    if (outletId) {
      where.outlet_id = outletId;
    }
    if (monthKey) {
      where.month_key = monthKey;
    }

    const history = await BudgetHistory.findAll({
      where,
      include: [
        {
          model: Outlet,
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['changed_at', 'DESC']],
      limit: Number(limit),
    });

    // Format response
    const formattedHistory = history.map((record) => ({
      id: record.id,
      outletId: record.outlet_id,
      outletName: record.Outlet?.name || `Outlet ${record.outlet_id}`,
      monthKey: record.month_key,
      previousAmount: Number(record.previous_amount),
      newAmount: Number(record.new_amount),
      changeAmount: Number(record.change_amount),
      changeType: record.change_type,
      reason: record.reason,
      changedBy: record.changed_by,
      changedAt: record.changed_at,
    }));

    return res.json(formattedHistory);
  } catch (err) {
    console.error('Error fetching budget history:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense,
  getBudgetSummary,
  updateMonthlyBudget,
  getBudgetHistory,
};
