const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
module.exports = sequelize.define('SalarySetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  policy: { type: DataTypes.TEXT, allowNull: false },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  updated_by: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'salary_settings', timestamps: true, underscored: true });
