'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('monthly_budgets', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      outlet_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'outlets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      month_key: {
        type: Sequelize.STRING(7),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
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

    // Add unique constraint - one budget per outlet per month
    await queryInterface.addIndex('monthly_budgets', ['outlet_id', 'month_key'], {
      unique: true,
      name: 'unique_outlet_month_budget',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('monthly_budgets');
  },
};
