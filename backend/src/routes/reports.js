const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate, (req, res, next) => {
  if (req.user?.outlet_id && !['admin', 'super_admin'].includes(req.user.role)) req.query.outletId = req.user.outlet_id;
  next();
});

router.get('/shift-end', authenticate, reportController.getShiftEndReport);
router.get('/profit-loss', authenticate, requirePermission('reports:view'), reportController.getProfitAndLossReport);
router.get('/customer-credit', authenticate, reportController.getCustomerCreditReport);
router.get('/gst', authenticate, reportController.getGstReport);
router.get('/top-selling', authenticate, reportController.getTopSellingReport);
router.get('/stock-summary', authenticate, requirePermission('reports:view'), reportController.getStockSummaryReport);
router.get('/low-stock', authenticate, reportController.getLowStockReport);
router.get('/purchase-orders', authenticate, reportController.getPurchaseOrderReport);
router.get('/employee-attendance', authenticate, reportController.getEmployeeAttendanceReport);
router.get('/gstr2', authenticate, reportController.getGstr2Report);
router.get('/export-csv', authenticate, requirePermission('reports:view'), reportController.exportReportCSV);
router.get('/export-pdf', authenticate, requirePermission('reports:view'), reportController.exportReportPDF);

module.exports = router;


