'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admins', 'otp_code', {
      type: Sequelize.STRING(6),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('admins', 'otp_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admins', 'otp_code');
    await queryInterface.removeColumn('admins', 'otp_expires_at');
  },
};
