'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('admins')) {
      const columns = await queryInterface.describeTable('admins');
      if (/^ENUM/i.test(columns.role.type)) {
        await queryInterface.changeColumn('admins', 'role', { type: Sequelize.STRING(50), defaultValue: 'admin' });
      }
    }
    if (tables.includes('roles')) {
      const columns = await queryInterface.describeTable('roles');
      if (!columns.permissions) {
        await queryInterface.addColumn('roles', 'permissions', { type: Sequelize.JSON, allowNull: true });
        await queryInterface.sequelize.query('UPDATE roles SET permissions = :permissions WHERE permissions IS NULL', {
          replacements: { permissions: JSON.stringify(['pos:view', 'inventory:view', 'services:view', 'expenses:view']) },
        });
      }
    }
    if (tables.includes('staff_members')) {
      const columns = await queryInterface.describeTable('staff_members');
      if (!columns.user_id) {
        await queryInterface.addColumn('staff_members', 'user_id', {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          unique: true,
          references: { model: 'admins', key: 'id' },
          onDelete: 'SET NULL',
        });
      }
    }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('staff_members', 'user_id');
    await queryInterface.removeColumn('roles', 'permissions');
  },
};
