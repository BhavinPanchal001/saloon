const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  anniversary: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  loyalty_points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_spend: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  total_visits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  credit_balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'customers',
  underscored: true,
  timestamps: true,
});

module.exports = Customer;
