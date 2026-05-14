const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const OutletProductPrice = sequelize.define('OutletProductPrice', {
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
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'outlet_product_prices',
  underscored: true,
  timestamps: true,
});

module.exports = OutletProductPrice;
