const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const productRoutes = require('./products');
const serviceRoutes = require('./services');
const expenseRoutes = require('./expenses');
const serviceCategoryRoutes = require('./serviceCategories');
const unitMasterRoutes = require('./unitMasters');
const packageRoutes = require('./packages');
const outletRoutes = require('./outlets');
const purchaseOrderRoutes = require('./purchaseOrders');
const outletInventoryRoutes = require('./outletInventory');
const paymentRoutes = require('./payments');
const posRoutes = require('./pos');
const bankRoutes = require('./banks');
const budgetRoutes = require('./budgets');
const auditLogRoutes = require('./auditLogRoutes');
const notificationRoutes = require('./notifications');
const printerRoutes = require('./printer');
const dashboardRoutes = require('./dashboard');
const attendanceRoutes = require('./attendance');
const userRoutes = require('./users');

// HR and Contract routes
const staffRoutes = require('./staff');
const contractRoutes = require('./contracts');
const roleRoutes = require('./roles');
const shiftRoutes = require('./shifts');
const leaveTypeRoutes = require('./leaveTypes');
const workWeekRoutes = require('./workWeeks');
const contractTypeRoutes = require('./contractTypes');
const holidayTemplateRoutes = require('./holidayTemplates');
const holidayRoutes = require('./holidays');
const contractGroupRoutes = require('./contractGroups');
const salaryMasterRoutes = require('./salaryMasters');
const couponRoutes = require('./couponRoutes');
const customerRoutes = require('./customers');
const appointmentRoutes = require('./appointmentRoutes');
const reportRoutes = require('./reports');
const payrollRoutes = require('./payroll');

router.get('/', (req, res) => {
  res.json({ message: 'Glowy Saloon API v1' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/services', serviceRoutes);
router.use('/expenses', expenseRoutes);
router.use('/service-categories', serviceCategoryRoutes);
router.use('/unit-masters', unitMasterRoutes);
router.use('/packages', packageRoutes);
router.use('/outlets', outletRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/outlet-inventory', outletInventoryRoutes);
router.use('/payments', paymentRoutes);
router.use('/pos', posRoutes);
router.use('/coupons', couponRoutes);
router.use('/customers', customerRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/reports', reportRoutes);
router.use('/banks', bankRoutes);
router.use('/budgets', budgetRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/notifications', notificationRoutes);
router.use('/printer', printerRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/attendance', attendanceRoutes);

// Register HR and Contract routes
router.use('/staff', staffRoutes);
router.use('/contracts', contractRoutes);
router.use('/roles', roleRoutes);
router.use('/shifts', shiftRoutes);
router.use('/leave-types', leaveTypeRoutes);
router.use('/work-weeks', workWeekRoutes);
router.use('/contract-types', contractTypeRoutes);
router.use('/holiday-templates', holidayTemplateRoutes);
router.use('/holidays', holidayRoutes);
router.use('/contract-groups', contractGroupRoutes);
router.use('/salary-masters', salaryMasterRoutes);
router.use('/payroll', payrollRoutes);

module.exports = router;
