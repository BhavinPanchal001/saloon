module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('bill_line_items');
    if (!columns.staff_effort) {
      await queryInterface.addColumn('bill_line_items', 'staff_effort', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bill_line_items', 'staff_effort');
  },
};
