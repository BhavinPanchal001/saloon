const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
const { readContractConfiguration } = require('../services/contractPolicies');

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING(250),
    allowNull: false,
  },
  employee_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  group_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  type_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  template_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'terminated'),
    defaultValue: 'draft',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  shift_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  work_week_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  overtime_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  overtime_type: {
    type: DataTypes.STRING(50),
    defaultValue: '1.5x',
  },
  overtime_calculation: {
    type: DataTypes.STRING(100),
    defaultValue: 'fixed_hourly',
  },
  overtime_rate: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  current_version: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 1,
  },
  leave_configuration: {
    type: DataTypes.JSON, allowNull: true,
    get() { return readContractConfiguration(this.getDataValue('leave_configuration')); },
  },
  holiday_configuration: {
    type: DataTypes.JSON, allowNull: true,
    get() { return readContractConfiguration(this.getDataValue('holiday_configuration')); },
  },
  probation_period_months: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  notice_period_days: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  previous_contract_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  original_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  terms_snapshot: { type: DataTypes.JSON, allowNull: true },
  document_metadata: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'contracts',
  underscored: true,
  timestamps: true,
});

module.exports = Contract;
