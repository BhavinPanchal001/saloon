const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const UnitMaster = sequelize.define('UnitMaster', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  group_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  primary_unit: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  primary_abbr: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  secondary_unit: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  secondary_abbr: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  conversion_ratio: {
    type: DataTypes.DECIMAL(14, 6),
    allowNull: false,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'unit_masters',
  underscored: true,
  timestamps: true,
});

module.exports = UnitMaster;
