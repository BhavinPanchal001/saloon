const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getHolidays);
router.post('/', hrMastersController.saveHoliday);
router.delete('/:id', hrMastersController.deleteHoliday);

module.exports = router;
