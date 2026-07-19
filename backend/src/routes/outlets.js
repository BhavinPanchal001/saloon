const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAll, getOne, create, update, toggleStatus, remove, getOutletFinancialSummary } = require('../controllers/outletController');

router.get('/', authenticate, getAll);
router.get('/:id/financial-summary', authenticate, getOutletFinancialSummary);
router.get('/:id', authenticate, getOne);
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.patch('/:id/toggle-status', authenticate, requireAdmin, toggleStatus);
router.delete('/:id', authenticate, requireAdmin, remove);

module.exports = router;
