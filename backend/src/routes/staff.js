const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', staffController.getAll);
router.get('/:id', staffController.getOne);
router.post('/', authenticate, requireAdmin, staffController.createOrUpdate);
router.put('/:id/status', staffController.updateStatus);
router.post('/:id/reset-password', staffController.resetPassword);
router.post('/:id/advances', staffController.grantAdvance);
router.delete('/:id', authenticate, requireAdmin, staffController.remove);

module.exports = router;
