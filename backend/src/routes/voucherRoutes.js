const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const { authenticate } = require('../middleware/auth');

// Public/POS validation or authenticated
router.post('/validate', voucherController.validateVoucher);

// Authenticated routes
router.use(authenticate);

router.get('/', voucherController.getVouchers);
router.get('/redemptions', voucherController.getRedemptionHistory);
router.get('/customer/:customerId', voucherController.getCustomerVouchers);
router.get('/reward-rules', voucherController.getVoucherRewardRules);
router.put('/reward-rules', voucherController.updateVoucherRewardRules);
router.post('/', voucherController.issueVoucher);
router.put('/:id', voucherController.updateVoucher);
router.delete('/:id', voucherController.deleteVoucher);
router.post('/:id/cancel', voucherController.cancelVoucher);
router.post('/:id/send-whatsapp', voucherController.resendWhatsApp);

module.exports = router;
