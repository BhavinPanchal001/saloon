const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getBusinessSettings,
  updateBusinessSettings,
} = require('../controllers/businessSettingsController');

router.get('/', authenticate, getBusinessSettings);
router.put('/', authenticate, requireAdmin, updateBusinessSettings);

module.exports = router;
