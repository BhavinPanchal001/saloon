const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const ProcessedPayroll = sequelize.define('ProcessedPayroll', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  month_key: {
    type: DataTypes.STRING(7),
    allowNull: false,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  employee_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
  total_salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_tax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_deduct: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_payable: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_paid: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  remaining: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'calculated',
  },
  pt_paid_date: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  bank_account_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'processed_payrolls',
  underscored: true,
  timestamps: true,
});

module.exports = ProcessedPayroll;
