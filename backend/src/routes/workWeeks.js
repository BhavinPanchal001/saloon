const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getWorkWeeks);
router.post('/', hrMastersController.saveWorkWeek);
router.delete('/:id', hrMastersController.deleteWorkWeek);
router.put('/:id/toggle', hrMastersController.toggleWorkWeek);

module.exports = router;
