const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  bill_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Unpaid',
  },
  bank_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  discount_type: {
    type: DataTypes.ENUM('percent', 'flat'),
    allowNull: true,
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  tax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'paid',
  },
  coupon_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  coupon_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  voucher_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  voucher_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  voucher_discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  awarded_voucher_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  awarded_voucher_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  awarded_voucher_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  points_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  points_redeemed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  points_discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  pos_terminal_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  pos_shift_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'bills',
  underscored: true,
  timestamps: true,
});

module.exports = Bill;
