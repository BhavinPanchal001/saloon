const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const OutletInventory = sequelize.define('OutletInventory', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  current_stock: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'outlet_inventories',
  underscored: true,
  timestamps: true,
});

module.exports = OutletInventory;
