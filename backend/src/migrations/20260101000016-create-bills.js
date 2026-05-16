module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bills', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      bill_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      outlet_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'outlets',
          key: 'id',
        },
        onDelete: 'RESTRICT',
      },
      customer_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      customer_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      payment_method: {
        type: Sequelize.ENUM('Cash', 'Card', 'UPI'),
        allowNull: false,
      },
      bank_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount_type: {
        type: Sequelize.ENUM('percent', 'flat'),
        allowNull: true,
      },
      discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      discount_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      tax: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('paid', 'refunded'),
        defaultValue: 'paid',
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

    await queryInterface.addIndex('bills', ['outlet_id']);
    await queryInterface.addIndex('bills', ['bill_number']);
    await queryInterface.addIndex('bills', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bills');
  },
};
