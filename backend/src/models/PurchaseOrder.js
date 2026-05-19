const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  po_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  supplier_name: { type: DataTypes.STRING(200), allowNull: false },
  supplier_contact: { type: DataTypes.STRING(100), allowNull: true },
  supplier_phone: { type: DataTypes.STRING(50), allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'received', 'cancelled'),
    defaultValue: 'pending',
  },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
  attachment_path: { type: DataTypes.STRING(500), allowNull: true },
  order_date: { type: DataTypes.DATEONLY, allowNull: false },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  received_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'purchase_orders',
  underscored: true,
  timestamps: true,
});

module.exports = PurchaseOrder;
