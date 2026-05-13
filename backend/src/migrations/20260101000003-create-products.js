'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      item_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      central_stock: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0,
      },
      unit_master_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      purchase_unit: {
        type: Sequelize.ENUM('primary', 'secondary'),
        defaultValue: 'primary',
      },
      consumption_unit: {
        type: Sequelize.ENUM('primary', 'secondary'),
        defaultValue: 'primary',
      },
      product_measure: {
        type: Sequelize.DECIMAL(12, 4),
        defaultValue: 1,
      },
      product_measure_unit: {
        type: Sequelize.ENUM('primary', 'secondary'),
        defaultValue: 'primary',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'active',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
