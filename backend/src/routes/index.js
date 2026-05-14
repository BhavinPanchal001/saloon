const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const productRoutes = require('./products');
const serviceRoutes = require('./services');
const serviceCategoryRoutes = require('./serviceCategories');
const unitMasterRoutes = require('./unitMasters');
const packageRoutes = require('./packages');
const outletRoutes = require('./outlets');
const purchaseOrderRoutes = require('./purchaseOrders');
const outletInventoryRoutes = require('./outletInventory');
const paymentRoutes = require('./payments');

router.get('/', (req, res) => {
  res.json({ message: 'Glowy Saloon API v1' });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/services', serviceRoutes);
router.use('/service-categories', serviceCategoryRoutes);
router.use('/unit-masters', unitMasterRoutes);
router.use('/packages', packageRoutes);
router.use('/outlets', outletRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/outlet-inventory', outletInventoryRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
