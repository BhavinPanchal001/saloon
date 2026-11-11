'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('contracts')) return;
    const columns = await queryInterface.describeTable('contracts');
    if (!columns.document_metadata) await queryInterface.addColumn('contracts', 'document_metadata', { type: Sequelize.JSON, allowNull: true });
  },
  async down(queryInterface) { await queryInterface.removeColumn('contracts', 'document_metadata'); },
};
