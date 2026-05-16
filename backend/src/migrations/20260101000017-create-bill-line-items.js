module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bill_line_items', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      bill_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'bills',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      item_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      item_type: {
        type: Sequelize.ENUM('service', 'package', 'product'),
        allowNull: false,
      },
      item_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      qty: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      staff_assigned: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      product_consumption: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      included_services: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('bill_line_items', ['bill_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bill_line_items');
  },
};
