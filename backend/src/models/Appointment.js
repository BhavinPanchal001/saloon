const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  customer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  staff_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  service_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  appointment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  end_time: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'confirmed',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bill_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'appointments',
  underscored: true,
  timestamps: true,
});

module.exports = Appointment;
