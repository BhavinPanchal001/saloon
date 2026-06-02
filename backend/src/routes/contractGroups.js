const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getContractGroups);
router.post('/', hrMastersController.saveContractGroup);
router.delete('/:id', hrMastersController.deleteContractGroup);

module.exports = router;
