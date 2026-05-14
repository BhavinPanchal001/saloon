const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  item_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  central_stock: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0,
  },
  opening_stock: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0,
  },
  unit_master_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  purchase_unit: {
    type: DataTypes.ENUM('primary', 'secondary'),
    defaultValue: 'primary',
  },
  consumption_unit: {
    type: DataTypes.ENUM('primary', 'secondary'),
    defaultValue: 'primary',
  },
  product_measure: {
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 1,
  },
  product_measure_unit: {
    type: DataTypes.ENUM('primary', 'secondary'),
    defaultValue: 'primary',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'products',
  underscored: true,
  timestamps: true,
});

module.exports = Product;
