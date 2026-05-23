'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      entity_type: {
        type: Sequelize.ENUM('outlet_inventory', 'central_stock', 'outlet_product_price'),
        allowNull: false,
        comment: 'Type of entity being audited',
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the entity being audited',
      },
      operation: {
        type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE', 'STOCK_ISSUE', 'STOCK_ADJUST'),
        allowNull: false,
        comment: 'Type of operation performed',
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous state of the entity (null for CREATE)',
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'New state of the entity (null for DELETE)',
      },
      changed_fields: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'List of fields that were changed',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID of user who performed the operation',
      },
      user_email: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Email of user who performed the operation',
      },
      outlet_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Outlet ID if operation is outlet-specific',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Product ID if operation is product-specific',
      },
      quantity_change: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Quantity change for stock operations',
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reference to related transaction (e.g., stock_issue_id)',
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of reference (e.g., stock_issue, purchase_order)',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the user who performed the operation',
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string of the client',
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Session identifier for tracking',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about the operation',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes for performance
    await queryInterface.addIndex('inventory_audit_logs', ['entity_type', 'entity_id'], {
      name: 'idx_audit_entity'
    });

    await queryInterface.addIndex('inventory_audit_logs', ['user_id'], {
      name: 'idx_audit_user'
    });

    await queryInterface.addIndex('inventory_audit_logs', ['outlet_id'], {
      name: 'idx_audit_outlet'
    });

    await queryInterface.addIndex('inventory_audit_logs', ['product_id'], {
      name: 'idx_audit_product'
    });

    await queryInterface.addIndex('inventory_audit_logs', ['operation'], {
      name: 'idx_audit_operation'
    });

    await queryInterface.addIndex('inventory_audit_logs', ['created_at'], {
      name: 'idx_audit_created'
    });

    await queryInterface.addIndex('inventory_audit_logs', ['reference_type', 'reference_id'], {
      name: 'idx_audit_reference'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_audit_logs');
  }
};
