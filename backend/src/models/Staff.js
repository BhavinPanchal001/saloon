const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Staff = sequelize.define('Staff', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
  },
  first_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  middle_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  last_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  personal_email: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  marital_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  biometric_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  joining_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  role_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  assigned_outlet_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  onboarding_status: {
    type: DataTypes.ENUM('pending', 'contract_accepted', 'document_uploaded', 'approved'),
    defaultValue: 'pending',
  },
  // Address fields
  street: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(100),
    defaultValue: 'IN',
  },
  pincode: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  // Bank Details
  bank_holder: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  bank_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  bank_account: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  bank_ifsc: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  bank_branch: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  bank_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'Savings',
  },
}, {
  tableName: 'staff_members',
  underscored: true,
  timestamps: true,
});

module.exports = Staff;
