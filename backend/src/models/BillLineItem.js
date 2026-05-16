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
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  staff_assigned: {
    type: DataTypes.STRING(50),
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
