'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await queryInterface.bulkInsert('admins', [
      {
        name: 'Glowy Super Admin',
        email: 'admin@glowy.com',
        password: hashedPassword,
        role: 'super_admin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('admins', { email: 'admin@glowy.com' });
  },
};
