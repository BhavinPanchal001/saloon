const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Package = sequelize.define('Package', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  package_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  package_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  offer_label: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.ENUM('hair', 'skin', 'grooming', 'spa', 'bridal'),
    defaultValue: 'hair',
  },
  validity_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 30,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  bookable_online: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  prepaid_only: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  max_redemptions_per_visit: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 1,
  },
  sale_channels: {
    type: DataTypes.JSON,
    defaultValue: ['front_desk', 'pos'],
  },
  assigned_outlet_ids: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  terms_and_conditions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'packages',
  underscored: true,
  timestamps: true,
});

module.exports = Package;
