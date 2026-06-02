const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Outlet = sequelize.define('Outlet', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  invoice_prefix: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  manager: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  employee_code_prefix: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'outlets',
  underscored: true,
  timestamps: true,
});

module.exports = Outlet;
