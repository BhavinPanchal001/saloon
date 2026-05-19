'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'images', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      after: 'status',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'images');
  },
};
