const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/settings', verifyToken, rewardController.getSettings);
router.put('/settings', verifyToken, rewardController.updateSettings);

router.get('/tiers', verifyToken, rewardController.getTiers);
router.post('/tiers', verifyToken, rewardController.createTier);
router.put('/tiers/:id', verifyToken, rewardController.updateTier);
router.delete('/tiers/:id', verifyToken, rewardController.deleteTier);

router.get('/customers/:customerId/history', verifyToken, rewardController.getCustomerPointsHistory);
router.post('/customers/:customerId/adjust', verifyToken, rewardController.adjustCustomerPointsHandler);

module.exports = router;
