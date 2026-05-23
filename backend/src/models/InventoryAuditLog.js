const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const InventoryAuditLog = sequelize.define('InventoryAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entity_type: {
    type: DataTypes.ENUM('outlet_inventory', 'central_stock', 'outlet_product_price'),
    allowNull: false,
    comment: 'Type of entity being audited',
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the entity being audited',
  },
  operation: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'STOCK_ISSUE', 'STOCK_ADJUST'),
    allowNull: false,
    comment: 'Type of operation performed',
  },
  old_values: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Previous state of the entity (null for CREATE)',
  },
  new_values: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'New state of the entity (null for DELETE)',
  },
  changed_fields: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'List of fields that were changed',
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of user who performed the operation',
  },
  user_email: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Email of user who performed the operation',
  },
  outlet_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Outlet ID if operation is outlet-specific',
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Product ID if operation is product-specific',
  },
  quantity_change: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Quantity change for stock operations',
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to related transaction (e.g., stock_issue_id)',
  },
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of reference (e.g., stock_issue, purchase_order)',
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address of the user who performed the operation',
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent string of the client',
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Session identifier for tracking',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the operation',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'inventory_audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_audit_entity',
      fields: ['entity_type', 'entity_id'],
    },
    {
      name: 'idx_audit_user',
      fields: ['user_id'],
    },
    {
      name: 'idx_audit_outlet',
      fields: ['outlet_id'],
    },
    {
      name: 'idx_audit_product',
      fields: ['product_id'],
    },
    {
      name: 'idx_audit_operation',
      fields: ['operation'],
    },
    {
      name: 'idx_audit_created',
      fields: ['created_at'],
    },
    {
      name: 'idx_audit_reference',
      fields: ['reference_type', 'reference_id'],
    },
  ],
});

module.exports = InventoryAuditLog;
