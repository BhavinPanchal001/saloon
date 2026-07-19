const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

// Safe JSON parse helper — returns fallback on corrupted/truncated data
const safeJsonParse = (raw, fallback = null) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Attendance: corrupt JSON in DB column, returning fallback. Error:', err.message);
    return fallback;
  }
};

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  staff_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'half_day', 'paid_leave', 'not_marked'),
    defaultValue: 'not_marked',
    allowNull: false,
  },
  check_in: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('check_in');
      return safeJsonParse(raw, null);
    },
    set(val) {
      this.setDataValue('check_in', val ? JSON.stringify(val) : null);
    }
  },
  check_out: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('check_out');
      return safeJsonParse(raw, null);
    },
    set(val) {
      this.setDataValue('check_out', val ? JSON.stringify(val) : null);
    }
  },
  breaks: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('breaks');
      return safeJsonParse(raw, []);
    },
    set(val) {
      this.setDataValue('breaks', val ? JSON.stringify(val) : JSON.stringify([]));
    }
  },
}, {
  tableName: 'attendances',
  underscored: true,
  timestamps: true,
});

module.exports = Attendance;
