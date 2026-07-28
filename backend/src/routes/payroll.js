const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

router.get('/', payrollController.getPayrolls);
router.get('/:id', payrollController.getPayrollById);
router.post('/', payrollController.createPayroll);
router.post('/:id/pay', payrollController.payPayroll);
router.delete('/:id', payrollController.deletePayroll);

module.exports = router;
