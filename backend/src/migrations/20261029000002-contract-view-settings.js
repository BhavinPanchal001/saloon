'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('contracts')) return;
    const columns = await queryInterface.describeTable('contracts');
    for (const column of ['leave_configuration', 'holiday_configuration']) {
      if (!columns[column]) await queryInterface.addColumn('contracts', column, { type: Sequelize.JSON, allowNull: true });
    }
    for (const column of ['probation_period_months', 'notice_period_days']) {
      if (!columns[column]) await queryInterface.addColumn('contracts', column, { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    }
  },
  async down(queryInterface) {
    for (const column of ['leave_configuration', 'holiday_configuration', 'probation_period_months', 'notice_period_days']) await queryInterface.removeColumn('contracts', column);
  },
};
