const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requirePermission } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');

const canEditExpense = (req, res, next) => {
  const user = req.user || req.admin;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const permissions = user.permissions || [];
  if (
    permissions.includes('*') ||
    ['admin', 'super_admin'].includes(user.role) ||
    permissions.includes('expenses:edit') ||
    permissions.includes('expenses:create')
  ) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden. Missing permission: expenses:edit' });
};

// Expense CRUD routes
router.get('/', authenticate, requirePermission('expenses:view'), expenseController.getExpenses);
router.get('/:id', authenticate, requirePermission('expenses:view'), expenseController.getExpenseById);
router.post('/', authenticate, requirePermission('expenses:create'), expenseController.createExpense);
router.put('/:id', authenticate, canEditExpense, expenseController.updateExpense);
router.delete('/:id', authenticate, requirePermission('expenses:delete'), expenseController.deleteExpense);

// Budget routes
router.get('/budget-summary', authenticate, requirePermission('expenses:view'), expenseController.getBudgetSummary);
router.post('/monthly-budget', authenticate, requireAdmin, expenseController.updateMonthlyBudget);
router.get('/budget-history', authenticate, requirePermission('expenses:view'), expenseController.getBudgetHistory);

module.exports = router;
