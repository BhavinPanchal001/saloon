const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

module.exports = sequelize.define('LeaveRequest', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  staff_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  contract_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  leave_type_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  duration: { type: DataTypes.STRING(10), allowNull: false },
  days: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  dates: { type: DataTypes.TEXT, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'pending' },
  created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
  review_note: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'leave_requests', underscored: true, timestamps: true });
