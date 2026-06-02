const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');

router.get('/', contractController.getAll);
router.get('/:id', contractController.getOne);
router.post('/', contractController.createOrUpdate);
router.delete('/:id', contractController.remove);

module.exports = router;
