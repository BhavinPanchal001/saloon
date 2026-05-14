const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const PackageService = sequelize.define('PackageService', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  package_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  service_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  sessions: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 1,
  },
}, {
  tableName: 'package_services',
  underscored: true,
  timestamps: true,
});

module.exports = PackageService;
