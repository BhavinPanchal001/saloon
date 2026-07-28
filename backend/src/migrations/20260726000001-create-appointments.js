'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('appointments', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      outlet_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      customer_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      customer_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      customer_phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      staff_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      service_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      appointment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      end_time: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
        defaultValue: 'confirmed',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      bill_id: {
        type: Sequelize.INTEGER.UNSIGNED,
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

    await queryInterface.addIndex('appointments', ['outlet_id', 'appointment_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('appointments');
  },
};
