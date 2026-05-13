const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAll, create, update, toggleStatus, remove } = require('../controllers/unitMasterController');

router.get('/', authenticate, getAll);
router.post('/', authenticate, create);
router.put('/:id', authenticate, update);
router.patch('/:id/toggle-status', authenticate, toggleStatus);
router.delete('/:id', authenticate, remove);

module.exports = router;
