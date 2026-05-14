const express = require('express');
const router = express.Router();
const {
  getInventory,
  issueProduct,
  getStockIssues,
  getOutletProductPrices,
  saveOutletProductPrice,
  deleteOutletProductPrice,
} = require('../controllers/outletInventoryController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Inventory routes
router.get('/', authenticate, getInventory);
router.post('/issue', authenticate, requireAdmin, issueProduct);

// Stock issue history
router.get('/issues', authenticate, getStockIssues);

// Outlet product prices
router.get('/prices', authenticate, getOutletProductPrices);
router.post('/prices', authenticate, requireAdmin, saveOutletProductPrice);
router.delete('/prices/:outletId/:productId', authenticate, requireAdmin, deleteOutletProductPrice);

module.exports = router;
