const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const LoyaltyTier = sequelize.define('LoyaltyTier', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  min_spend: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  multiplier: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
  },
  badge_color: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: '#cd7f32',
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Award',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'loyalty_tiers',
  underscored: true,
  timestamps: true,
});

module.exports = LoyaltyTier;
