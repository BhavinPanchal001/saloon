const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const bankController = require('../controllers/bankController');

// Bank CRUD
router.get('/', authenticate, bankController.getBanks);
router.get('/active', authenticate, bankController.getActiveBanks);
router.post('/transfer', authenticate, bankController.transfer);
router.get('/:id', authenticate, bankController.getBankById);
router.post('/', authenticate, bankController.createBank);
router.put('/:id', authenticate, bankController.updateBank);
router.delete('/:id', authenticate, bankController.deleteBank);
router.patch('/:id/set-default', authenticate, bankController.setDefaultBank);

// Transactions
router.get('/:id/transactions', authenticate, bankController.getTransactions);
router.post('/:id/deposit', authenticate, bankController.deposit);
router.post('/:id/withdraw', authenticate, bankController.withdraw);

module.exports = router;
