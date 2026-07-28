module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('bills', 'payment_method', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'Unpaid',
    });
    await queryInterface.changeColumn('bills', 'status', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'paid',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('bills', 'payment_method', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.changeColumn('bills', 'status', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'paid',
    });
  },
};
