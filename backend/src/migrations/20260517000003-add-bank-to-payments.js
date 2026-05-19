'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payments', 'bank_account_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      after: 'payment_date',
      references: {
        model: 'banks',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for better performance
    await queryInterface.addIndex('payments', ['bank_account_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('payments', ['bank_account_id']);
    await queryInterface.removeColumn('payments', 'bank_account_id');
  },
};
