'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('unit_masters', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      group_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      primary_unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      primary_abbr: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      secondary_unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      secondary_abbr: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      conversion_ratio: {
        type: Sequelize.DECIMAL(14, 6),
        allowNull: false,
        defaultValue: 1,
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
    await queryInterface.dropTable('unit_masters');
  },
};
