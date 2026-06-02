const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getContractTypes);
router.post('/', hrMastersController.saveContractType);
router.delete('/:id', hrMastersController.deleteContractType);
router.put('/:id/toggle', hrMastersController.toggleContractType);

module.exports = router;
