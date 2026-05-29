const express = require('express');
const router = express.Router();
const { login, verifyOTP, resendOTP, getMe, setupTOTP, confirmTOTP, disableTOTP } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/me', authenticate, getMe);

router.post('/totp/setup', authenticate, setupTOTP);
router.post('/totp/confirm', authenticate, confirmTOTP);
router.post('/totp/disable', authenticate, disableTOTP);

module.exports = router;
