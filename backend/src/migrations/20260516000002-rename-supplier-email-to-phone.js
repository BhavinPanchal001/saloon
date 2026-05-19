'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('purchase_orders', 'supplier_email', 'supplier_phone');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('purchase_orders', 'supplier_phone', 'supplier_email');
  },
};
