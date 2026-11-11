module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('bill_line_items');
    if (!columns.staff_ids) {
      await queryInterface.addColumn('bill_line_items', 'staff_ids', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
    await queryInterface.changeColumn('bill_line_items', 'staff_assigned', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Retain TEXT to avoid truncating talent names saved since this migration.
    await queryInterface.removeColumn('bill_line_items', 'staff_ids');
  },
};
