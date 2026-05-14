const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAll, getOne, create, updateStatus, remove } = require('../controllers/paymentController');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.post('/', authenticate, requireAdmin, create);
router.patch('/:id/status', authenticate, requireAdmin, updateStatus);
router.delete('/:id', authenticate, requireAdmin, remove);

module.exports = router;
