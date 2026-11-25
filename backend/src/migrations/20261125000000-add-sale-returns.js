const indexName = 'bills_original_bill_id_idx';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('bills');
    if (!columns.original_bill_id) {
      await queryInterface.addColumn('bills', 'original_bill_id', {
        type: Sequelize.INTEGER.UNSIGNED, allowNull: true,
      });
    }
    if (!columns.return_details) {
      await queryInterface.addColumn('bills', 'return_details', {
        type: Sequelize.JSON, allowNull: true,
      });
    }
    const indexes = await queryInterface.showIndex('bills');
    if (!indexes.some(index => index.name === indexName)) {
      await queryInterface.addIndex('bills', ['original_bill_id'], { name: indexName });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('bills', indexName);
    await queryInterface.removeColumn('bills', 'return_details');
    await queryInterface.removeColumn('bills', 'original_bill_id');
  },
};
