const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const PaymentDetail = sequelize.define('PaymentDetail', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  payment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  payment_mode: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'store_credit'),
    allowNull: false,
  },
  bank_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  tableName: 'payment_details',
  underscored: true,
  timestamps: true,
});

module.exports = PaymentDetail;
