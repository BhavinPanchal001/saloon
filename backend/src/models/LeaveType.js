const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const LeaveType = sequelize.define('LeaveType', {
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
  days_allowed: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 12,
  },
  max_monthly: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 2,
  },
  advance_notice_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 7,
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  allow_anytime: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  allow_hourly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  hourly_hours: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
  },
  needed_document: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'leave_types',
  underscored: true,
  timestamps: true,
});

module.exports = LeaveType;
