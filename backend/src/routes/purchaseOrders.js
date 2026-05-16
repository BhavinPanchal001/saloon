const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAll, getOne, create, update, approve, receive, cancel, remove, removeAttachment } = require('../controllers/purchaseOrderController');
const { getByPurchaseOrder } = require('../controllers/paymentController');
const upload = require('../middleware/upload');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.get('/:id/payments', authenticate, getByPurchaseOrder);
router.post('/', authenticate, requireAdmin, upload.single('attachment'), create);
router.put('/:id', authenticate, requireAdmin, upload.single('attachment'), update);
router.delete('/:id', authenticate, requireAdmin, remove);
router.delete('/:id/attachment', authenticate, requireAdmin, removeAttachment);
router.patch('/:id/approve', authenticate, requireAdmin, approve);
router.patch('/:id/receive', authenticate, requireAdmin, receive);
router.patch('/:id/cancel', authenticate, requireAdmin, cancel);

module.exports = router;
