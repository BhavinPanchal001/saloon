'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'images', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      after: 'product_linkages',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('services', 'images');
  },
};
