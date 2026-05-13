const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/serviceController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getById);
router.post('/', authenticate, create);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);

module.exports = router;
