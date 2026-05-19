const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const MonthlyBudget = sequelize.define('MonthlyBudget', {
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
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'monthly_budgets',
  underscored: true,
  timestamps: true,
});

// Class method to get or create a budget
MonthlyBudget.getOrCreate = async function(outletId, monthKey) {
  let budget = await this.findOne({
    where: { outlet_id: outletId, month_key: monthKey },
  });

  if (!budget) {
    budget = await this.create({
      outlet_id: outletId,
      month_key: monthKey,
      amount: 0,
    });
  }

  return budget;
};

module.exports = MonthlyBudget;
