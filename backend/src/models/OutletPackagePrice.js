const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const OutletPackagePrice = sequelize.define('OutletPackagePrice', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  package_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'outlet_package_prices',
  underscored: true,
  timestamps: true,
});

module.exports = OutletPackagePrice;
