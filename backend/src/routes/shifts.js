const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getShifts);
router.post('/', hrMastersController.saveShift);
router.delete('/:id', hrMastersController.deleteShift);
router.put('/:id/toggle', hrMastersController.toggleShift);

module.exports = router;
