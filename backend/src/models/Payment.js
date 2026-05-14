const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  purchase_order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  expense_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  pos_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  transaction_reference: { type: DataTypes.STRING(100), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  payment_date: { type: DataTypes.DATEONLY, allowNull: false },
}, {
  tableName: 'payments',
  underscored: true,
  timestamps: true,
});

module.exports = Payment;
