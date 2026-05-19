'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('banks', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      bank_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      account_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      account_holder_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      ifsc_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      branch_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      branch_address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Add indexes for better performance
    await queryInterface.addIndex('banks', ['is_active']);
    await queryInterface.addIndex('banks', ['is_default']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('banks');
  },
};
