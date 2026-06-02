const express = require('express');
const router = express.Router();
const hrMastersController = require('../controllers/hrMastersController');

router.get('/', hrMastersController.getRoles);
router.post('/', hrMastersController.saveRole);
router.delete('/:id', hrMastersController.deleteRole);
router.put('/:id/toggle', hrMastersController.toggleRole);

module.exports = router;
