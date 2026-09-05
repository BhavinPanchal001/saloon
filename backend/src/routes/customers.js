const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const customerPortalController = require('../controllers/customerPortalController');
const { authenticate, authenticateCustomer } = require('../middleware/auth');

// Website Customer Portal - Public Auth Routes
router.post('/portal/auth/phone-login', customerPortalController.loginCustomerWithPhone);
router.post('/portal/auth/phone-register', customerPortalController.registerCustomerWithPhone);

// Website Customer Portal - Authenticated Routes
router.get('/portal/me', authenticateCustomer, customerPortalController.getCustomerProfile);
router.get('/portal/appointments', authenticateCustomer, customerPortalController.getCustomerAppointments);
router.post('/portal/appointments/:id/cancel', authenticateCustomer, customerPortalController.cancelCustomerAppointment);

// Internal / Admin Routes
router.get('/', authenticate, customerController.getCustomers);
router.get('/:id', authenticate, customerController.getCustomerById);
router.get('/:id/ledger', authenticate, customerController.getCustomerLedger);
router.post('/:id/settle', authenticate, customerController.settleCustomerBalance);
router.post('/:id/send-whatsapp-reminder', authenticate, customerController.sendCustomerDueReminder);
router.post('/', authenticate, customerController.createCustomer);
router.put('/:id', authenticate, customerController.updateCustomer);
router.delete('/:id', authenticate, customerController.deleteCustomer);

module.exports = router;

