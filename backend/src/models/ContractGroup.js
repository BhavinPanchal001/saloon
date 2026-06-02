const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const ContractGroup = sequelize.define('ContractGroup', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  duration: {
    type: DataTypes.STRING(100),
    defaultValue: "12 Months",
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  employee_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'contract_groups',
  underscored: true,
  timestamps: true,
});

module.exports = ContractGroup;
