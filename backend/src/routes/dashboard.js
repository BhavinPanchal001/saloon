const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate: authenticateToken } = require('../middleware/auth');

// GET /api/dashboard/summary?outletId=
router.get('/summary', authenticateToken, dashboardController.getDashboardSummary);

module.exports = router;
