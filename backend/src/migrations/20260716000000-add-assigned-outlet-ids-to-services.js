'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('services');
    if (!tableInfo.assigned_outlet_ids) {
      await queryInterface.addColumn('services', 'assigned_outlet_ids', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('services');
    if (tableInfo.assigned_outlet_ids) {
      await queryInterface.removeColumn('services', 'assigned_outlet_ids');
    }
  },
};

