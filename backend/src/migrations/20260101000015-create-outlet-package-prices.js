module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('outlet_package_prices', {
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
        onDelete: 'CASCADE',
      },
      package_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'packages',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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

    await queryInterface.addIndex('outlet_package_prices', ['outlet_id', 'package_id'], {
      unique: true,
      name: 'unique_outlet_package_price',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('outlet_package_prices');
  },
};
