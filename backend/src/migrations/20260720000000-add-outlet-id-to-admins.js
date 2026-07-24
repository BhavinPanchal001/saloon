'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('admins');
    if (!tableInfo.outlet_id) {
      await queryInterface.addColumn('admins', 'outlet_id', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('admins');
    if (tableInfo.outlet_id) {
      await queryInterface.removeColumn('admins', 'outlet_id');
    }
  },
};
