const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { authenticate: verifyToken, requireBusinessAdmin } = require('../middleware/auth');

router.get('/settings', verifyToken, rewardController.getSettings);
router.put('/settings', verifyToken, requireBusinessAdmin, rewardController.updateSettings);

router.get('/tiers', verifyToken, rewardController.getTiers);
router.post('/tiers', verifyToken, requireBusinessAdmin, rewardController.createTier);
router.put('/tiers/:id', verifyToken, requireBusinessAdmin, rewardController.updateTier);
router.delete('/tiers/:id', verifyToken, requireBusinessAdmin, rewardController.deleteTier);

router.get('/customers/:customerId/history', verifyToken, rewardController.getCustomerPointsHistory);
router.post('/customers/:customerId/adjust', verifyToken, requireBusinessAdmin, rewardController.adjustCustomerPointsHandler);

module.exports = router;
