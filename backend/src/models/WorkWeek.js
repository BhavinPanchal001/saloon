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
      try {
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    set(val) {
      this.setDataValue('operational_days', JSON.stringify(val || []));
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
