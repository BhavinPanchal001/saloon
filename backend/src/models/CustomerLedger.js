const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const CustomerLedger = sequelize.define('CustomerLedger', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  bill_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('deposit', 'bill_payment', 'due_charge', 'settlement', 'adjustment'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  balance_after: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  payment_method: {
    type: DataTypes.ENUM('Cash', 'Card', 'UPI', 'Store Credit', 'Bank', 'Adjustment'),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'customer_ledgers',
  underscored: true,
  timestamps: true,
});

module.exports = CustomerLedger;
