const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('low_stock', 'info', 'success', 'warning', 'alert'),
    allowNull: false,
    defaultValue: 'info',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'notifications',
  underscored: true,
  timestamps: true,
});

module.exports = Notification;
