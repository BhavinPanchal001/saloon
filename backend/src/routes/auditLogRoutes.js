const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');

// Get audit logs with filtering and pagination
// GET /api/audit-logs?entityType=outlet_inventory&operation=STOCK_ISSUE&limit=50&offset=0
router.get('/', auditLogController.getAuditLogs);

// Get audit trail for specific entity
// GET /api/audit-logs/entity/:entityType/:entityId
router.get('/entity/:entityType/:entityId', auditLogController.getEntityAuditTrail);

// Get inventory audit summary for a time period
// GET /api/audit-logs/summary?startDate=2024-01-01&endDate=2024-12-31&outletId=1
router.get('/summary', auditLogController.getInventoryAuditSummary);

// Get stock movement history for analysis
// GET /api/audit-logs/stock-movements?startDate=2024-01-01&endDate=2024-12-31&outletId=1
router.get('/stock-movements', auditLogController.getStockMovementHistory);

module.exports = router;
