'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendances', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      staff_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'staff_members',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'half_day', 'paid_leave', 'not_marked'),
        defaultValue: 'not_marked',
        allowNull: false,
      },
      check_in: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      check_out: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      breaks: {
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

    // Add unique constraint on staff_id and date
    await queryInterface.addConstraint('attendances', {
      fields: ['staff_id', 'date'],
      type: 'unique',
      name: 'unique_staff_date_attendance'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendances');
  },
};
