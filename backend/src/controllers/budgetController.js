const { Op } = require('sequelize');
const { MonthlyBudget, BudgetHistory, Outlet, Expense } = require('../models');

// Helper to get month key from date
const getMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Helper to calculate expenses for an outlet in a month
const calculateExpenses = async (outletId, monthKey) => {
  // Calculate from Expenses table
  const expenses = await Expense.sum('total_amount', {
    where: {
      outlet_id: outletId,
      month_key: monthKey,
    },
  }) || 0;

  return parseFloat(expenses);
};

// Get budget summary with expense calculations
exports.getBudgetSummary = async (req, res) => {
  try {
    const { outletId, monthKey } = req.query;
    const targetMonth = monthKey || getMonthKey(new Date());

    // Get outlets to include
    let outlets;
    if (outletId) {
      outlets = await Outlet.findAll({
        where: { id: outletId },
      });
    } else {
      outlets = await Outlet.findAll();
    }

    // Get budgets for these outlets and month
    const outletIds = outlets.map(o => o.id);
    const budgets = await MonthlyBudget.findAll({
      where: {
        outlet_id: { [Op.in]: outletIds },
        month_key: targetMonth,
      },
    });

    // Calculate totals and per-outlet breakdown
    let totalMonthlyBudget = 0;
    let totalExpensesSoFar = 0;
    const budgetBreakdown = [];

    for (const outlet of outlets) {
      const budgetRecord = budgets.find(b => b.outlet_id === outlet.id);
      const outletBudget = budgetRecord ? parseFloat(budgetRecord.amount) : 0;
      const outletExpenses = await calculateExpenses(outlet.id, targetMonth);
      const remainingBudget = outletBudget - outletExpenses;
      const spendPercentage = outletBudget > 0
        ? Math.round((outletExpenses / outletBudget) * 100)
        : 0;

      totalMonthlyBudget += outletBudget;
      totalExpensesSoFar += outletExpenses;

      budgetBreakdown.push({
        outlet_id: outlet.id,
        outlet_name: outlet.name,
        amount: outletBudget,
        spend_percentage: spendPercentage,
        current_expenses: outletExpenses,
        remaining_budget: remainingBudget,
      });
    }

    const remainingBalance = totalMonthlyBudget - totalExpensesSoFar;
    const spendPercentage = totalMonthlyBudget > 0
      ? Math.round((totalExpensesSoFar / totalMonthlyBudget) * 100)
      : 0;

    res.json({
      total_monthly_budget: totalMonthlyBudget,
      total_expenses_so_far: totalExpensesSoFar,
      remaining_balance: remainingBalance,
      spend_percentage: spendPercentage,
      month_key: targetMonth,
      budgets: budgetBreakdown,
    });
  } catch (error) {
    console.error('Error getting budget summary:', error);
    res.status(500).json({ message: 'Failed to get budget summary', error: error.message });
  }
};

// Set or update budget for an outlet
exports.setBudget = async (req, res) => {
  try {
    const { outletId, monthKey, amount, reason } = req.body;
    const userId = req.admin?.id;

    if (!outletId || !monthKey || amount === undefined) {
      return res.status(400).json({ message: 'outletId, monthKey, and amount are required' });
    }

    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount < 0) {
      return res.status(400).json({ message: 'Amount must be a valid positive number' });
    }

    // Get or create budget record
    let budget = await MonthlyBudget.findOne({
      where: { outlet_id: outletId, month_key: monthKey },
    });

    let previousAmount = 0;
    if (budget) {
      previousAmount = parseFloat(budget.amount);
      budget.amount = newAmount;
      await budget.save();
    } else {
      budget = await MonthlyBudget.create({
        outlet_id: outletId,
        month_key: monthKey,
        amount: newAmount,
      });
    }

    // Log change if amount changed
    if (previousAmount !== newAmount) {
      await BudgetHistory.logChange({
        outletId,
        monthKey,
        previousAmount,
        newAmount,
        reason,
        userId,
      });
    }

    // Return updated summary
    const outlet = await Outlet.findByPk(outletId);
    const currentExpenses = await calculateExpenses(outletId, monthKey);
    const remainingBudget = newAmount - currentExpenses;
    const spendPercentage = newAmount > 0
      ? Math.round((currentExpenses / newAmount) * 100)
      : 0;

    res.json({
      message: 'Budget updated successfully',
      budget: {
        outlet_id: outletId,
        outlet_name: outlet?.name,
        month_key: monthKey,
        amount: newAmount,
        current_expenses: currentExpenses,
        remaining_budget: remainingBudget,
        spend_percentage: spendPercentage,
      },
    });
  } catch (error) {
    console.error('Error setting budget:', error);
    res.status(500).json({ message: 'Failed to set budget', error: error.message });
  }
};

// Get budget history
exports.getBudgetHistory = async (req, res) => {
  try {
    const { outletId, monthKey, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (outletId) where.outlet_id = outletId;
    if (monthKey) where.month_key = monthKey;

    const history = await BudgetHistory.findAll({
      where,
      include: [
        {
          model: Outlet,
          attributes: ['id', 'name'],
        },
      ],
      order: [['changed_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedHistory = history.map(h => ({
      id: h.id,
      outlet_id: h.outlet_id,
      outlet_name: h.Outlet?.name,
      month_key: h.month_key,
      previous_amount: parseFloat(h.previous_amount),
      new_amount: parseFloat(h.new_amount),
      change_amount: parseFloat(h.change_amount),
      change_type: h.change_type,
      reason: h.reason,
      changed_at: h.changed_at,
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('Error getting budget history:', error);
    res.status(500).json({ message: 'Failed to get budget history', error: error.message });
  }
};

// Get available months
exports.getAvailableMonths = async (req, res) => {
  try {
    // Get distinct month keys from budgets
    const budgetMonths = await MonthlyBudget.findAll({
      attributes: ['month_key'],
      group: ['month_key'],
      raw: true,
    });

    // Get distinct month keys from expenses
    const expenseMonths = await Expense.findAll({
      attributes: ['month_key'],
      group: ['month_key'],
      raw: true,
    });

    // Generate range: 3 months ago to 3 months ahead
    const months = [];
    const today = new Date();

    for (let i = -3; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }

    // Combine all months, remove duplicates, sort descending
    const allMonths = Array.from(new Set([
      ...months,
      ...budgetMonths.map(b => b.month_key),
      ...expenseMonths.map(e => e.month_key),
    ])).sort().reverse();

    res.json(allMonths);
  } catch (error) {
    console.error('Error getting available months:', error);
    res.status(500).json({ message: 'Failed to get available months', error: error.message });
  }
};
