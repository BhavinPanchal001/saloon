const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.get('/shift-end', authenticate, reportController.getShiftEndReport);
router.get('/profit-loss', authenticate, reportController.getProfitAndLossReport);
router.get('/customer-credit', authenticate, reportController.getCustomerCreditReport);

module.exports = router;
