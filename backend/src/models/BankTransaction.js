'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const BankTransaction = sequelize.define(
  'BankTransaction',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    bank_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer_in', 'transfer_out'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
    },
    reference_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    related_bank_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    tableName: 'bank_transactions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = BankTransaction;
