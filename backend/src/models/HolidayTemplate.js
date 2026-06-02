const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const HolidayTemplate = sequelize.define('HolidayTemplate', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(100),
    defaultValue: 'National',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'holiday_templates',
  underscored: true,
  timestamps: true,
});

module.exports = HolidayTemplate;
