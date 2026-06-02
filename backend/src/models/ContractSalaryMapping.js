const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const ContractSalaryMapping = sequelize.define('ContractSalaryMapping', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  contract_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  salary_component_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  custom_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'contract_salary_mappings',
  underscored: true,
  timestamps: true,
});

module.exports = ContractSalaryMapping;
