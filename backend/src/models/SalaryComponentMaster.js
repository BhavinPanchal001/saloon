const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const SalaryComponentMaster = sequelize.define('SalaryComponentMaster', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('earning', 'deduction'),
    allowNull: false,
    defaultValue: 'earning',
  },
  calculation_type: {
    type: DataTypes.ENUM('fixed', 'percentage'),
    allowNull: false,
    defaultValue: 'fixed',
  },
  default_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'salary_component_masters',
  underscored: true,
  timestamps: true,
});

module.exports = SalaryComponentMaster;
