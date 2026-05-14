const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAll, create, update, toggleStatus, remove } = require('../controllers/unitMasterController');

router.get('/', authenticate, getAll);
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.patch('/:id/toggle-status', authenticate, requireAdmin, toggleStatus);
router.delete('/:id', authenticate, requireAdmin, remove);

module.exports = router;
