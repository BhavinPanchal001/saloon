'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('packages', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      package_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      package_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      offer_label: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.ENUM('hair', 'skin', 'grooming', 'spa', 'bridal'),
        defaultValue: 'hair',
      },
      validity_days: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 30,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'active',
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      bookable_online: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      prepaid_only: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      max_redemptions_per_visit: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 1,
      },
      sale_channels: {
        type: Sequelize.JSON,
        defaultValue: ['front_desk', 'pos'],
      },
      assigned_outlet_ids: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      terms_and_conditions: {
        type: Sequelize.TEXT,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('package_services', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      package_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'packages', key: 'id' },
        onDelete: 'CASCADE',
      },
      service_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      sessions: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 1,
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
    await queryInterface.dropTable('package_services');
    await queryInterface.dropTable('packages');
  },
};
