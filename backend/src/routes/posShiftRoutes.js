const express = require('express');
const router = express.Router();
const posShiftController = require('../controllers/posShiftController');
const { authenticate: authenticateToken } = require('../middleware/auth');

// Terminal management routes
router.get('/terminals', authenticateToken, posShiftController.getTerminals);
router.post('/terminals', authenticateToken, posShiftController.createTerminal);
router.put('/terminals/:id', authenticateToken, posShiftController.updateTerminal);
router.delete('/terminals/:id', authenticateToken, posShiftController.deleteTerminal);

// POS Shift management routes
router.get('/shifts/active', authenticateToken, posShiftController.getActiveShift);
router.post('/shifts/open', authenticateToken, posShiftController.openShift);
router.put('/shifts/:id', authenticateToken, posShiftController.updateActiveShift);
router.post('/shifts/:id/cash-movement', authenticateToken, posShiftController.addCashMovement);
router.get('/shifts/:id/x-report', authenticateToken, posShiftController.getXReport);
router.post('/shifts/:id/close', authenticateToken, posShiftController.closeShift);
router.get('/shifts/history', authenticateToken, posShiftController.getShiftHistory);

module.exports = router;
