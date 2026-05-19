const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  item_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  qty: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    defaultValue: 0,
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  bill_no: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  month_key: {
    type: DataTypes.STRING(7),
    allowNull: false,
  },
}, {
  tableName: 'expenses',
  underscored: true,
  timestamps: true,
});

module.exports = Expense;
