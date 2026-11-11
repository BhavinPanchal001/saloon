const readline = require('node:readline/promises');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { sequelize, Admin } = require('../src/models');

(async () => {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await sequelize.authenticate();
    if (await Admin.count() > 0) throw new Error('An admin already exists. Manage additional accounts from the application.');
    const name = (await prompt.question('Administrator name: ')).trim();
    const email = (await prompt.question('Administrator email: ')).trim().toLowerCase();
    if (!name || !email) throw new Error('Name and email are required.');
    const password = randomBytes(18).toString('base64url');
    await Admin.create({ name, email, password: await bcrypt.hash(password, 12), role: 'super_admin', is_active: true });
    console.log(`Created administrator: ${email}\nInitial password: ${password}\nSave this password and change it after signing in.`);
  } catch (error) {
    console.error('Administrator setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    prompt.close();
    await sequelize.close();
  }
})();
