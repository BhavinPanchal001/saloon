'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payments', 'bill_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      after: 'pos_id',
      references: {
        model: 'bills',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payments', 'bill_id');
  },
};
