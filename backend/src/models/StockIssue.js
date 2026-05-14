const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const StockIssue = sequelize.define('StockIssue', {
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
  qty: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
  },
  issued_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'stock_issues',
  underscored: true,
  timestamps: true,
});

module.exports = StockIssue;
