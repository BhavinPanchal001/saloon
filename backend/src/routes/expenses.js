const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');

// Expense CRUD routes
router.get('/', authenticate, expenseController.getExpenses);
router.post('/', authenticate, expenseController.createExpense);
router.delete('/:id', authenticate, requireAdmin, expenseController.deleteExpense);

// Budget routes
router.get('/budget-summary', authenticate, expenseController.getBudgetSummary);
router.post('/monthly-budget', authenticate, requireAdmin, expenseController.updateMonthlyBudget);
router.get('/budget-history', authenticate, expenseController.getBudgetHistory);

module.exports = router;
