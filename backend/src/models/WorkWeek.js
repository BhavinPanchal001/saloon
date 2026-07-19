const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const WorkWeek = sequelize.define('WorkWeek', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  operational_days: {
    type: DataTypes.TEXT, // Store as JSON array of day strings
    allowNull: false,
    get() {
      const raw = this.getDataValue('operational_days');
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return raw.split(',').map(s => s.trim()).filter(Boolean);
      }
    },
    set(val) {
      if (Array.isArray(val)) {
        this.setDataValue('operational_days', JSON.stringify(val));
      } else if (typeof val === 'string') {
        const arr = val.split(',').map(s => s.trim()).filter(Boolean);
        this.setDataValue('operational_days', JSON.stringify(arr));
      } else {
        this.setDataValue('operational_days', JSON.stringify([]));
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'work_weeks',
  underscored: true,
  timestamps: true,
});

module.exports = WorkWeek;
