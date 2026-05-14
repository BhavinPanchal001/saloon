const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAll, getOne, create, update, approve, receive, cancel, remove } = require('../controllers/purchaseOrderController');
const { getByPurchaseOrder } = require('../controllers/paymentController');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.get('/:id/payments', authenticate, getByPurchaseOrder);
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.delete('/:id', authenticate, requireAdmin, remove);
router.patch('/:id/approve', authenticate, requireAdmin, approve);
router.patch('/:id/receive', authenticate, requireAdmin, receive);
router.patch('/:id/cancel', authenticate, requireAdmin, cancel);

module.exports = router;
