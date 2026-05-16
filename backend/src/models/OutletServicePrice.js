const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const OutletServicePrice = sequelize.define('OutletServicePrice', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  service_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'outlet_service_prices',
  underscored: true,
  timestamps: true,
});

module.exports = OutletServicePrice;
