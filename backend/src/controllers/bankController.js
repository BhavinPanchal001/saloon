'use strict';

const { Bank, BankTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');

// Self-healing migration for banks table
(async () => {
  try {
    const [columns] = await sequelize.query("SHOW COLUMNS FROM banks");
    const colNames = columns.map(c => c.Field);
    if (!colNames.includes('upi_id')) {
      await sequelize.query("ALTER TABLE banks ADD COLUMN `upi_id` VARCHAR(100) NULL");
    }
  } catch (_) {}
})();

const formatBank = (bank) => ({
  id: bank.id,
  bankName: bank.bankName,
  accountNumber: bank.accountNumber,
  accountHolderName: bank.accountHolderName,
  ifscCode: bank.ifscCode,
  branchName: bank.branchName,
  branchAddress: bank.branchAddress || null,
  upiId: bank.upiId || bank.upi_id || null,
  balance: Number(bank.balance),
  isDefault: bank.isDefault,
  isActive: bank.isActive,
  createdAt: bank.createdAt,
  updatedAt: bank.updatedAt,
});


const formatTransaction = (txn) => ({
  id: txn.id,
  bankId: txn.bank_id,
  type: txn.type,
  amount: Number(txn.amount),
  description: txn.description,
  referenceNumber: txn.reference_number || null,
  relatedBankId: txn.related_bank_id || null,
  createdAt: txn.createdAt,
});

// GET /banks
exports.getBanks = async (req, res) => {
  try {
    const banks = await Bank.findAll({
      order: [
        ['is_default', 'DESC'],
        ['is_active', 'DESC'],
        ['bank_name', 'ASC'],
      ],
    });
    return res.json(banks.map(formatBank));
  } catch (err) {
    console.error('[bankController.getBanks]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /banks/active
exports.getActiveBanks = async (req, res) => {
  try {
    const banks = await Bank.findAll({
      where: { isActive: true },
      order: [
        ['is_default', 'DESC'],
        ['bank_name', 'ASC'],
      ],
    });
    return res.json(banks.map(formatBank));
  } catch (err) {
    console.error('[bankController.getActiveBanks]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /banks/:id
exports.getBankById = async (req, res) => {
  try {
    const bank = await Bank.findByPk(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Bank not found.' });
    return res.json(formatBank(bank));
  } catch (err) {
    console.error('[bankController.getBankById]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /banks
exports.createBank = async (req, res) => {
  const { bankName, accountNumber, accountHolderName, ifscCode, branchName, branchAddress, upiId, isDefault, isActive } = req.body;

  if (!bankName || !accountNumber || !accountHolderName || !ifscCode || !branchName) {
    return res.status(400).json({ message: 'bankName, accountNumber, accountHolderName, ifscCode, and branchName are required.' });
  }

  const t = await sequelize.transaction();
  try {
    if (isDefault) {
      await Bank.update({ isDefault: false }, { where: {}, transaction: t });
    }

    const bank = await Bank.create({
      bankName,
      accountNumber,
      accountHolderName,
      ifscCode: ifscCode.toUpperCase(),
      branchName,
      branchAddress: branchAddress || null,
      upiId: upiId || null,
      balance: 0,
      isDefault: isDefault ? true : false,
      isActive: isActive !== undefined ? isActive : true,
    }, { transaction: t });


    await t.commit();
    return res.status(201).json(formatBank(bank));
  } catch (err) {
    await t.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Account number already exists.' });
    }
    console.error('[bankController.createBank]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /banks/:id
exports.updateBank = async (req, res) => {
  const { bankName, accountNumber, accountHolderName, ifscCode, branchName, branchAddress, upiId, isDefault, isActive } = req.body;

  const t = await sequelize.transaction();
  try {
    const bank = await Bank.findByPk(req.params.id, { transaction: t });
    if (!bank) {
      await t.rollback();
      return res.status(404).json({ message: 'Bank not found.' });
    }

    if (isDefault) {
      await Bank.update({ isDefault: false }, { where: { id: { [Op.ne]: bank.id } }, transaction: t });
    }

    await bank.update({
      bankName: bankName ?? bank.bankName,
      accountNumber: accountNumber ?? bank.accountNumber,
      accountHolderName: accountHolderName ?? bank.accountHolderName,
      ifscCode: ifscCode ? ifscCode.toUpperCase() : bank.ifscCode,
      branchName: branchName ?? bank.branchName,
      branchAddress: branchAddress !== undefined ? (branchAddress || null) : bank.branchAddress,
      upiId: upiId !== undefined ? (upiId || null) : bank.upiId,
      isDefault: isDefault !== undefined ? isDefault : bank.isDefault,
      isActive: isActive !== undefined ? isActive : bank.isActive,
    }, { transaction: t });


    await t.commit();
    return res.json(formatBank(bank));
  } catch (err) {
    await t.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Account number already exists.' });
    }
    console.error('[bankController.updateBank]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /banks/:id
exports.deleteBank = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const bank = await Bank.findByPk(req.params.id, { transaction: t });
    if (!bank) {
      await t.rollback();
      return res.status(404).json({ message: 'Bank not found.' });
    }

    const wasDefault = bank.isDefault;
    await bank.destroy({ transaction: t });

    if (wasDefault) {
      const nextBank = await Bank.findOne({
        where: { isActive: true },
        order: [['created_at', 'ASC']],
        transaction: t,
      });
      if (nextBank) {
        await nextBank.update({ isDefault: true }, { transaction: t });
      }
    }

    await t.commit();
    return res.json({ message: 'Bank deleted.' });
  } catch (err) {
    await t.rollback();
    console.error('[bankController.deleteBank]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /banks/:id/set-default
exports.setDefaultBank = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const bank = await Bank.findByPk(req.params.id, { transaction: t });
    if (!bank) {
      await t.rollback();
      return res.status(404).json({ message: 'Bank not found.' });
    }

    await Bank.update({ isDefault: false }, { where: {}, transaction: t });
    await bank.update({ isDefault: true }, { transaction: t });

    await t.commit();
    return res.json(formatBank(bank));
  } catch (err) {
    await t.rollback();
    console.error('[bankController.setDefaultBank]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /banks/:id/deposit
exports.deposit = async (req, res) => {
  const { amount, description, referenceNumber } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const t = await sequelize.transaction();
  try {
    const bank = await Bank.findByPk(req.params.id, { transaction: t });
    if (!bank) {
      await t.rollback();
      return res.status(404).json({ message: 'Bank not found.' });
    }
    if (!bank.isActive) {
      await t.rollback();
      return res.status(400).json({ message: 'Cannot transact on an inactive bank account.' });
    }

    const newBalance = Number(bank.balance) + numAmount;
    await bank.update({ balance: newBalance }, { transaction: t });

    const txn = await BankTransaction.create({
      bank_id: bank.id,
      type: 'deposit',
      amount: numAmount,
      description: description || 'Deposit',
      reference_number: referenceNumber || null,
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({
      bank: formatBank(bank),
      transaction: formatTransaction(txn),
    });
  } catch (err) {
    await t.rollback();
    console.error('[bankController.deposit]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /banks/:id/withdraw
exports.withdraw = async (req, res) => {
  const { amount, description, referenceNumber } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const t = await sequelize.transaction();
  try {
    const bank = await Bank.findByPk(req.params.id, { transaction: t });
    if (!bank) {
      await t.rollback();
      return res.status(404).json({ message: 'Bank not found.' });
    }
    if (!bank.isActive) {
      await t.rollback();
      return res.status(400).json({ message: 'Cannot transact on an inactive bank account.' });
    }
    if (Number(bank.balance) < numAmount) {
      await t.rollback();
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    const newBalance = Number(bank.balance) - numAmount;
    await bank.update({ balance: newBalance }, { transaction: t });

    const txn = await BankTransaction.create({
      bank_id: bank.id,
      type: 'withdrawal',
      amount: numAmount,
      description: description || 'Withdrawal',
      reference_number: referenceNumber || null,
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({
      bank: formatBank(bank),
      transaction: formatTransaction(txn),
    });
  } catch (err) {
    await t.rollback();
    console.error('[bankController.withdraw]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /banks/transfer
exports.transfer = async (req, res) => {
  const { fromBankId, toBankId, amount, description } = req.body;
  const numAmount = Number(amount);

  if (!fromBankId || !toBankId) {
    return res.status(400).json({ message: 'fromBankId and toBankId are required.' });
  }
  if (String(fromBankId) === String(toBankId)) {
    return res.status(400).json({ message: 'Source and destination accounts must be different.' });
  }
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const t = await sequelize.transaction();
  try {
    const fromBank = await Bank.findByPk(fromBankId, { transaction: t });
    const toBank = await Bank.findByPk(toBankId, { transaction: t });

    if (!fromBank || !toBank) {
      await t.rollback();
      return res.status(404).json({ message: 'One or both bank accounts not found.' });
    }
    if (!fromBank.isActive || !toBank.isActive) {
      await t.rollback();
      return res.status(400).json({ message: 'Both bank accounts must be active.' });
    }
    if (Number(fromBank.balance) < numAmount) {
      await t.rollback();
      return res.status(400).json({ message: 'Insufficient balance in source account.' });
    }

    await fromBank.update({ balance: Number(fromBank.balance) - numAmount }, { transaction: t });
    await toBank.update({ balance: Number(toBank.balance) + numAmount }, { transaction: t });

    const desc = description || 'Transfer';
    const outTxn = await BankTransaction.create({
      bank_id: fromBank.id,
      type: 'transfer_out',
      amount: numAmount,
      description: `Transfer to ${toBank.bankName}: ${desc}`,
      related_bank_id: toBank.id,
    }, { transaction: t });

    const inTxn = await BankTransaction.create({
      bank_id: toBank.id,
      type: 'transfer_in',
      amount: numAmount,
      description: `Transfer from ${fromBank.bankName}: ${desc}`,
      related_bank_id: fromBank.id,
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({
      fromBank: formatBank(fromBank),
      toBank: formatBank(toBank),
      transactions: [formatTransaction(outTxn), formatTransaction(inTxn)],
    });
  } catch (err) {
    await t.rollback();
    console.error('[bankController.transfer]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /banks/:id/transactions
exports.getTransactions = async (req, res) => {
  try {
    const bank = await Bank.findByPk(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Bank not found.' });

    const transactions = await BankTransaction.findAll({
      where: { bank_id: req.params.id },
      order: [['created_at', 'DESC']],
    });

    return res.json(transactions.map(formatTransaction));
  } catch (err) {
    console.error('[bankController.getTransactions]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
