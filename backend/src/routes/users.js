const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All user management routes require authentication and admin permissions
router.use(authenticate);

router.get('/', requireAdmin, userController.getUsers);
router.get('/:id', requireAdmin, userController.getUserById);
router.post('/', requireAdmin, userController.createUser);
router.put('/:id', requireAdmin, userController.updateUser);
router.patch('/:id/toggle-status', requireAdmin, userController.toggleUserStatus);
router.delete('/:id', requireAdmin, userController.deleteUser);

module.exports = router;
