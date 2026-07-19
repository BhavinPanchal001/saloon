const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get budget summary (with expense calculations)
router.get('/summary', budgetController.getBudgetSummary);

// Get budget history
router.get('/history', budgetController.getBudgetHistory);

// Get available months
router.get('/months', budgetController.getAvailableMonths);

// Set/update budget (admin only)
router.post('/', requireAdmin, budgetController.setBudget);

module.exports = router;
