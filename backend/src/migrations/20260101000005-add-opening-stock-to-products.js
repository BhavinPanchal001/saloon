'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'opening_stock', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0,
      after: 'central_stock',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'opening_stock');
  },
};
