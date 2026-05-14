const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/serviceCategoryController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, getAll);
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.delete('/:id', authenticate, requireAdmin, remove);

module.exports = router;
