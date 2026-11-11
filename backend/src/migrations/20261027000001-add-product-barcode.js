'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('products');
    if (!columns.barcode) {
      await queryInterface.addColumn('products', 'barcode', {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
    }
    const indexes = await queryInterface.showIndex('products');
    if (!indexes.some(index => index.name === 'products_barcode_unique')) {
      await queryInterface.addIndex('products', ['barcode'], {
        unique: true,
        name: 'products_barcode_unique',
      });
    }
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('products', 'products_barcode_unique');
    await queryInterface.removeColumn('products', 'barcode');
  },
};
