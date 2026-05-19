module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Budgets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
        comment: 'Format: YYYY-MM',
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

    // Unique constraint: one budget per outlet per month
    await queryInterface.addIndex('Budgets', ['outlet_id', 'month_key'], {
      unique: true,
      name: 'budget_outlet_month_unique',
    });

    // Index for faster queries by month
    await queryInterface.addIndex('Budgets', ['month_key'], {
      name: 'budget_month_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Budgets');
  },
};
