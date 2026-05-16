'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('purchase_orders', 'attachment_path', {
      type: Sequelize.STRING(500),
      allowNull: true,
      after: 'notes',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('purchase_orders', 'attachment_path');
  },
};
