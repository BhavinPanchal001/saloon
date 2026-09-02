const express = require('express');
const router = express.Router();
const whatsappSettingsController = require('../controllers/whatsappSettingsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/whatsapp/settings
router.get('/settings', authenticate, whatsappSettingsController.getSettings);

// PUT /api/whatsapp/settings
router.put('/settings', authenticate, requireAdmin, whatsappSettingsController.updateSettings);

// GET /api/whatsapp/status
router.get('/status', authenticate, whatsappSettingsController.getStatus);

// POST /api/whatsapp/baileys/connect
router.post('/baileys/connect', authenticate, requireAdmin, whatsappSettingsController.connectBaileys);

// POST /api/whatsapp/baileys/disconnect
router.post('/baileys/disconnect', authenticate, requireAdmin, whatsappSettingsController.disconnectBaileys);

// POST /api/whatsapp/test-message
router.post('/test-message', authenticate, requireAdmin, whatsappSettingsController.sendTestMessage);

// GET /api/whatsapp/logs
router.get('/logs', authenticate, whatsappSettingsController.getLogs);

module.exports = router;
