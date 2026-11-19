const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { assertSalaryPeriodOpen } = require('../services/salaryPeriodLock');

router.use(async (req, res, next) => {
  if (req.method !== 'POST' || !req.body.staffId || !req.body.date) return next();
  try { await assertSalaryPeriodOpen(req.body.staffId, [req.body.date]); next(); }
  catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to verify payroll period.' }); }
});

router.get('/', attendanceController.fetchAttendance);
router.get('/summary', attendanceController.fetchAttendanceSummary);
router.post('/mark', attendanceController.markAttendance);
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.post('/break-in', attendanceController.breakIn);
router.post('/break-out', attendanceController.breakOut);

module.exports = router;
