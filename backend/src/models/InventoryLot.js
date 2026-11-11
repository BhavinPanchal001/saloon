const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
module.exports = sequelize.define('InventoryLot', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  location_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: '0 = central; otherwise outlet ID' },
  source_key: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  received_at: { type: DataTypes.DATE, allowNull: false },
  remaining_qty: { type: DataTypes.DECIMAL(16, 4), allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
}, { tableName: 'inventory_lots', underscored: true });
