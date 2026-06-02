const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const ContractTypeTemplate = sequelize.define('ContractTypeTemplate', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  contract_type_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  template_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  version: {
    type: DataTypes.STRING(20),
    defaultValue: "1.0",
  },
  template_content: {
    type: DataTypes.TEXT, // HTML text generated inside rich text editor
    allowNull: false,
  },
}, {
  tableName: 'contract_type_templates',
  underscored: true,
  timestamps: true,
});

module.exports = ContractTypeTemplate;
