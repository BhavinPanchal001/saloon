const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requirePermission } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');

// Expense CRUD routes
router.get('/', authenticate, requirePermission('expenses:view'), expenseController.getExpenses);
router.post('/', authenticate, requirePermission('expenses:create'), expenseController.createExpense);
router.delete('/:id', authenticate, requirePermission('expenses:delete'), expenseController.deleteExpense);

// Budget routes
router.get('/budget-summary', authenticate, requirePermission('expenses:view'), expenseController.getBudgetSummary);
router.post('/monthly-budget', authenticate, requireAdmin, expenseController.updateMonthlyBudget);
router.get('/budget-history', authenticate, requirePermission('expenses:view'), expenseController.getBudgetHistory);

module.exports = router;
