const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.get('/', attendanceController.fetchAttendance);
router.get('/summary', attendanceController.fetchAttendanceSummary);
router.post('/mark', attendanceController.markAttendance);
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.post('/break-in', attendanceController.breakIn);
router.post('/break-out', attendanceController.breakOut);

module.exports = router;
