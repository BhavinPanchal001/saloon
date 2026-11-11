'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('staff_members')) return;
    const columns = await queryInterface.describeTable('staff_members');
    if (!columns.access_role) await queryInterface.addColumn('staff_members', 'access_role', { type: Sequelize.STRING(50), allowNull: true });
    if (columns.role_id.allowNull === false) await queryInterface.changeColumn('staff_members', 'role_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('staff_members', 'access_role');
  },
};
