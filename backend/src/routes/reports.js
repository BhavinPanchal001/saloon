const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.get('/shift-end', authenticate, reportController.getShiftEndReport);
router.get('/profit-loss', authenticate, reportController.getProfitAndLossReport);
router.get('/customer-credit', authenticate, reportController.getCustomerCreditReport);
router.get('/gst', authenticate, reportController.getGstReport);
router.get('/top-selling', authenticate, reportController.getTopSellingReport);
router.get('/stock-summary', authenticate, reportController.getStockSummaryReport);
router.get('/low-stock', authenticate, reportController.getLowStockReport);
router.get('/purchase-orders', authenticate, reportController.getPurchaseOrderReport);
router.get('/employee-attendance', authenticate, reportController.getEmployeeAttendanceReport);
router.get('/employee-payroll', authenticate, reportController.getEmployeePayrollReport);
router.get('/gstr2', authenticate, reportController.getGstr2Report);
router.get('/export-csv', authenticate, reportController.exportReportCSV);
router.get('/export-pdf', authenticate, reportController.exportReportPDF);

module.exports = router;


