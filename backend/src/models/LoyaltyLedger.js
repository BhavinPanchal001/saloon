const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const LoyaltyLedger = sequelize.define('LoyaltyLedger', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  bill_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('earned', 'redeemed', 'adjusted', 'expired', 'refunded'),
    allowNull: false,
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  tier_name: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  balance_after: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'loyalty_ledgers',
  underscored: true,
  timestamps: true,
});

module.exports = LoyaltyLedger;
