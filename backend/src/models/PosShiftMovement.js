const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const PosShiftMovement = sequelize.define('PosShiftMovement', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  pos_shift_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('CASH_IN', 'CASH_OUT'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'pos_shift_movements',
  underscored: true,
  timestamps: true,
});

module.exports = PosShiftMovement;
