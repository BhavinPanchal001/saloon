const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Coupon = sequelize.define('Coupon', {
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
  title: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  discount_type: {
    type: DataTypes.ENUM('percent', 'flat'),
    allowNull: false,
    defaultValue: 'percent',
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  min_spend: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  max_discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  valid_from: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  usage_limit: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  used_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'coupons',
  underscored: true,
  timestamps: true,
});

module.exports = Coupon;
