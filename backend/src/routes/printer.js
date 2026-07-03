const express = require('express');
const router = express.Router();
const printerSettingsController = require('../controllers/printerSettingsController');
const { authenticate: authenticateToken } = require('../middleware/auth');

// GET /api/printer/status
router.get('/status', authenticateToken, printerSettingsController.getStatus);

// POST /api/printer/toggle
router.post('/toggle', authenticateToken, printerSettingsController.toggle);

// POST /api/printer/test-print
router.post('/test-print', authenticateToken, printerSettingsController.testPrint);

module.exports = router;
