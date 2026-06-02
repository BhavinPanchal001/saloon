const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getHolidayTemplates);
router.post('/', hrMastersController.saveHolidayTemplate);
router.delete('/:id', hrMastersController.deleteHolidayTemplate);

module.exports = router;
