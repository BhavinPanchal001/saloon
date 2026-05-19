const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Bank = sequelize.define('Bank', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  bankName: { type: DataTypes.STRING(200), allowNull: false },
  accountNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  accountHolderName: { type: DataTypes.STRING(200), allowNull: false },
  ifscCode: { type: DataTypes.STRING(20), allowNull: false },
  branchName: { type: DataTypes.STRING(200), allowNull: false },
  branchAddress: { type: DataTypes.TEXT, allowNull: true },
  balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'banks',
  underscored: true,
  timestamps: true,
});

module.exports = Bank;
