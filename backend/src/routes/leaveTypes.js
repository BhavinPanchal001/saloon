const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getLeaveTypes);
router.post('/', hrMastersController.saveLeaveType);
router.delete('/:id', hrMastersController.deleteLeaveType);

module.exports = router;
