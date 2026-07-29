const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const PosShift = sequelize.define('PosShift', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  pos_terminal_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  opened_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  opening_cash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  expected_closing_cash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  actual_closing_cash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  variance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'CLOSED'),
    defaultValue: 'OPEN',
  },
  opening_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  closing_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'pos_shifts',
  underscored: true,
  timestamps: true,
});

module.exports = PosShift;
