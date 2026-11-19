const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
module.exports = sequelize.define('SalaryCalculation', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  staff_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  month_key: { type: DataTypes.STRING(7), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  snapshot: { type: DataTypes.TEXT('long'), allowNull: false },
  source_hash: { type: DataTypes.STRING(64), allowNull: false },
  created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  finalized_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'salary_calculations', underscored: true, timestamps: true, indexes: [{ name: 'salary_calculations_employee_month', unique: true, fields: ['staff_id', 'month_key'] }] });
