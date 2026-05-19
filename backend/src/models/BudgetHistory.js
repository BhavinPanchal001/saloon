const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const BudgetHistory = sequelize.define('BudgetHistory', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  month_key: {
    type: DataTypes.STRING(7),
    allowNull: false,
  },
  previous_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  new_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  change_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  change_type: {
    type: DataTypes.ENUM('increase', 'decrease'),
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  changed_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  changed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'BudgetHistories',
  underscored: true,
  timestamps: true,
});

// Static method to log budget changes
BudgetHistory.logChange = async function({ outletId, monthKey, previousAmount, newAmount, reason, userId }) {
  const changeAmount = Math.abs(newAmount - previousAmount);
  const changeType = newAmount > previousAmount ? 'increase' : 'decrease';

  return await this.create({
    outlet_id: outletId,
    month_key: monthKey,
    previous_amount: previousAmount,
    new_amount: newAmount,
    change_amount: changeAmount,
    change_type: changeType,
    reason: reason || `Budget ${changeType}d`,
    changed_by: userId,
    changed_at: new Date(),
  });
};

module.exports = BudgetHistory;
