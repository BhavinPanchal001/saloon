const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  start_time: {
    type: DataTypes.STRING(20), // Store format HH:MM
    allowNull: false,
  },
  end_time: {
    type: DataTypes.STRING(20), // Store format HH:MM
    allowNull: false,
  },
  break_duration: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 60,
  },
  grace_period: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 15,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'shifts',
  underscored: true,
  timestamps: true,
});

module.exports = Shift;
