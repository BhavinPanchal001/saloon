const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/serviceController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getById);
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.delete('/:id', authenticate, requireAdmin, remove);

module.exports = router;
