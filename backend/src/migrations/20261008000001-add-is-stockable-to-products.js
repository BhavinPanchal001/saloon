'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('products');
    if (!tableDescription.is_stockable) {
      await queryInterface.addColumn('products', 'is_stockable', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: 'status',
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('products');
    if (tableDescription.is_stockable) {
      await queryInterface.removeColumn('products', 'is_stockable');
    }
  },
};
