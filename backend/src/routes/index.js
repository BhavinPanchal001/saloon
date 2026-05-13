const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const productRoutes = require('./products');
const serviceRoutes = require('./services');
const serviceCategoryRoutes = require('./serviceCategories');
const unitMasterRoutes = require('./unitMasters');

router.get('/', (req, res) => {
  res.json({ message: 'Glowy Saloon API v1' });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/services', serviceRoutes);
router.use('/service-categories', serviceCategoryRoutes);
router.use('/unit-masters', unitMasterRoutes);

module.exports = router;
