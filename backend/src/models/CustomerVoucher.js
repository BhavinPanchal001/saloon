const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const CustomerVoucher = sequelize.define('CustomerVoucher', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  voucher_type: {
    type: DataTypes.ENUM('cash', 'flat', 'percent'),
    allowNull: false,
    defaultValue: 'cash',
  },
  initial_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  balance_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  min_spend: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  valid_from: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'redeemed', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'active',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  issued_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  redeemed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  redeemed_bill_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  issued_from_bill_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'customer_vouchers',
  underscored: true,
  timestamps: true,
});

module.exports = CustomerVoucher;
