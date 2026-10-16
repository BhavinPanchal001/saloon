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
  barcode: {
    type: DataTypes.STRING(100),
    allowNull: true,
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
  is_stockable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  images: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('images');
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue('images', val ? JSON.stringify(val) : null);
    },
  },
}, {
  tableName: 'products',
  underscored: true,
  timestamps: true,
});

module.exports = Product;
