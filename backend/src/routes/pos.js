const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { authenticate: authenticateToken } = require('../middleware/auth');

// GET /api/pos/catalog?outletId=
router.get('/catalog', authenticateToken, posController.getCatalog);

// POST /api/pos/checkout
router.post('/checkout', authenticateToken, posController.checkout);

// GET /api/pos/bills?outletId=&search=&paymentMethod=
router.get('/bills', authenticateToken, posController.getBills);

// GET /api/pos/bills/:id
router.get('/bills/:id', authenticateToken, posController.getBillById);

module.exports = router;
