'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payment_details', 'bank_account_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      after: 'payment_mode',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payment_details', 'bank_account_id');
  },
};
