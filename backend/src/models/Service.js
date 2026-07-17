const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
const ServiceCategory = require('./ServiceCategory');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  service_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  duration: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 30,
  },
  category_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  product_linkages: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  assigned_outlet_ids: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  images: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('images');
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue('images', val ? JSON.stringify(val) : null);
    },
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'services',
  underscored: true,
  timestamps: true,
});

Service.belongsTo(ServiceCategory, { foreignKey: 'category_id', as: 'category' });
ServiceCategory.hasMany(Service, { foreignKey: 'category_id', as: 'services' });

module.exports = Service;
