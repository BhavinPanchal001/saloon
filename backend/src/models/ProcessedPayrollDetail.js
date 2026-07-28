const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const ProcessedPayrollDetail = sequelize.define('ProcessedPayrollDetail', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  processed_payroll_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  staff_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  base_salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  tax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  deduction: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  payable: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  paid: {
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
  present_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
  absent_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
  leave_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
  overtime_hours: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  commission_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'processed_payroll_details',
  underscored: true,
  timestamps: true,
});

module.exports = ProcessedPayrollDetail;
