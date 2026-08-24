const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');

// Public endpoints (no auth required)
router.post('/public', appointmentController.createPublicAppointment);
router.get('/public/services', appointmentController.getPublicServicesAndOutlets);

// Authenticated staff/admin endpoints
router.get('/', authenticate, appointmentController.getAppointments);
router.get('/:id', authenticate, appointmentController.getAppointmentById);
router.post('/', authenticate, appointmentController.createAppointment);
router.patch('/:id/status', authenticate, appointmentController.updateAppointmentStatus);
router.put('/:id', authenticate, appointmentController.updateAppointment);
router.delete('/:id', authenticate, appointmentController.deleteAppointment);

module.exports = router;

