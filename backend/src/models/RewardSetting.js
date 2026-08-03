const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const RewardSetting = sequelize.define('RewardSetting', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'reward_settings',
  underscored: true,
  timestamps: true,
});

module.exports = RewardSetting;
