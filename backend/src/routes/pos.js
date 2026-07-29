const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const printController = require('../controllers/printController');
const { authenticate: authenticateToken, requirePermission } = require('../middleware/auth');

// GET /api/pos/catalog?outletId=
router.get('/catalog', authenticateToken, requirePermission('pos:view'), posController.getCatalog);

// POST /api/pos/checkout
router.post('/checkout', authenticateToken, requirePermission('pos:create'), posController.checkout);

// GET /api/pos/bills?outletId=&search=&paymentMethod=
router.get('/bills', authenticateToken, requirePermission('pos:view'), posController.getBills);

// GET /api/pos/bills/:id
router.get('/bills/:id', authenticateToken, requirePermission('pos:view'), posController.getBillById);

// PUT /api/pos/bills/:id
router.put('/bills/:id', authenticateToken, requirePermission('pos:create'), posController.updateBill);

// POST /api/pos/bills/:id/payments
router.post('/bills/:id/payments', authenticateToken, requirePermission('pos:create'), posController.addBillPayment);

// POST /api/pos/print-receipt/:billId
router.post('/print-receipt/:billId', authenticateToken, requirePermission('pos:view'), printController.printBillReceipt);

// POST /api/pos/bills/:id/send-whatsapp
router.post('/bills/:id/send-whatsapp', authenticateToken, requirePermission('pos:view'), posController.sendWhatsAppBill);

module.exports = router;

