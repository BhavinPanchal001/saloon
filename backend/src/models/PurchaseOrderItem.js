const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  purchase_order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  product_name: { type: DataTypes.STRING(200), allowNull: false },
  qty: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  line_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, {
  tableName: 'purchase_order_items',
  underscored: true,
  timestamps: true,
});

module.exports = PurchaseOrderItem;
