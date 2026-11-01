const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
module.exports = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  location_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  lot_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  quantity: { type: DataTypes.DECIMAL(16, 4), allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  reference: { type: DataTypes.STRING(150), allowNull: false },
}, { tableName: 'inventory_movements', underscored: true });
