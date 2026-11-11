const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const BillLineItem = sequelize.define('BillLineItem', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  bill_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  item_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  item_type: {
    type: DataTypes.ENUM('service', 'package', 'product'),
    allowNull: false,
  },
  item_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  qty: {
    type: DataTypes.DECIMAL(16, 4),
    allowNull: false,
    defaultValue: 1,
  },
  price: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
  },
  barcode: { type: DataTypes.STRING(64), allowNull: true },
  base_qty: { type: DataTypes.DECIMAL(16, 4), allowNull: true },
  cost_total: { type: DataTypes.DECIMAL(16, 2), allowNull: true },
  cost_allocations: { type: DataTypes.JSON, allowNull: true },
  stock_requirements: { type: DataTypes.JSON, allowNull: true },
  stock_signature: { type: DataTypes.TEXT, allowNull: true },
  staff_assigned: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  staff_ids: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  product_consumption: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
  included_services: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'bill_line_items',
  underscored: true,
  timestamps: true,
});

module.exports = BillLineItem;
