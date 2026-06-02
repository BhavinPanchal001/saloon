const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

router.get('/', staffController.getAll);
router.get('/:id', staffController.getOne);
router.post('/', staffController.createOrUpdate);
router.put('/:id/status', staffController.updateStatus);
router.post('/:id/reset-password', staffController.resetPassword);
router.post('/:id/advances', staffController.grantAdvance);
router.delete('/:id', staffController.remove);

module.exports = router;
