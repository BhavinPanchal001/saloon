const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getSalaryMasters);
router.get('/:id', hrMastersController.getSalaryMasterById);
router.post('/', hrMastersController.saveSalaryMaster);
router.delete('/:id', hrMastersController.deleteSalaryMaster);
router.put('/:id/toggle', hrMastersController.toggleSalaryMaster);

module.exports = router;
