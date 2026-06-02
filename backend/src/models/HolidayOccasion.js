const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const HolidayOccasion = sequelize.define('HolidayOccasion', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  holiday_template_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  occasion_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  occasion_type: {
    type: DataTypes.STRING(100),
    defaultValue: 'National',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'holiday_occasions',
  underscored: true,
  timestamps: true,
});

module.exports = HolidayOccasion;
