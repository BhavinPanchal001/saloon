module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('bills', 'payment_method', {
      type: Sequelize.ENUM('Cash', 'Card', 'UPI', 'Split'),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('bills', 'payment_method', {
      type: Sequelize.ENUM('Cash', 'Card', 'UPI'),
      allowNull: false,
    });
  },
};
