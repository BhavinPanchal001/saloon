const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/serviceCategoryController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getAll);
router.post('/', authenticate, create);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);

module.exports = router;
