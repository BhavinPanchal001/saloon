const bcrypt = require('bcryptjs');
const { verifiedConnection, acquireMigrationLock } = require('./connection');
const configurations = require('../../src/config/database');

const salons = [
  { slug: 'pc2-aster', name: 'Aster Sample Salon', codes: ['PC2-A1', 'PC2-A2'] },
  { slug: 'pc2-birch', name: 'Birch Sample Salon', codes: ['PC2-B1'] },
];
const accounts = [
  { name: 'Aster Owner', email: 'aster-owner@example.test', passwordKey: 'PC2_ASTER_OWNER', salon: 0 },
  { name: 'Aster Outlet', email: 'aster-outlet@example.test', passwordKey: 'PC2_ASTER_OUTLET', salon: 0, outlet: 0 },
  { name: 'Birch Owner', email: 'birch-owner@example.test', passwordKey: 'PC2_BIRCH_OWNER', salon: 1 },
];

async function seed(connection, passwords) {
  await connection.beginTransaction();
  try {
    const ids = [];
    for (const salon of salons) {
      await connection.execute(
        'INSERT INTO organizations (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?',
        [salon.slug, salon.name, salon.name],
      );
      const [[organization]] = await connection.execute('SELECT id FROM organizations WHERE slug = ?', [salon.slug]);
      const outlets = [];
      for (const code of salon.codes) {
        await connection.execute(
          `INSERT INTO outlets (organization_id, name, code, city, created_at, updated_at)
           VALUES (?, ?, ?, 'Sample City', NOW(), NOW()) ON DUPLICATE KEY UPDATE code = code`,
          [organization.id, `${salon.name} ${code}`, code],
        );
        const [[outlet]] = await connection.execute('SELECT id, organization_id FROM outlets WHERE code = ?', [code]);
        if (outlet.organization_id !== organization.id) throw new Error(`Unexpected owner for ${code}.`);
        outlets.push(outlet.id);
      }
      ids.push({ organization: organization.id, outlets });
    }

    for (const [index, account] of accounts.entries()) {
      const { organization, outlets } = ids[account.salon];
      const outlet = outlets[account.outlet] ?? null;
      await connection.execute(
        `INSERT INTO admins (name, email, password, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE password = ?, updated_at = NOW()`,
        [account.name, account.email, passwords[index], passwords[index]],
      );
      const [[admin]] = await connection.execute('SELECT id FROM admins WHERE email = ?', [account.email]);
      await connection.execute(
        `INSERT INTO organization_memberships (organization_id, admin_id, role, outlet_id)
         VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = ?, outlet_id = ?, active = TRUE`,
        [organization, admin.id, outlet ? 'member' : 'owner', outlet, outlet ? 'member' : 'owner', outlet],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const [server, database] = process.argv.slice(2);
  const config = configurations[process.env.NODE_ENV || 'development'];
  if (!['127.0.0.1', 'localhost', '::1'].includes(config?.host) ||
      !['glowy_pc2_dev', 'glowy_pc2_test'].includes(database)) {
    throw new Error('Use a dedicated PC 2 schema on loopback MySQL.');
  }
  const passwords = accounts.map(({ passwordKey }) => process.env[passwordKey]);
  if (passwords.some(password => !password || Buffer.byteLength(password) < 16 ||
      Buffer.byteLength(password) > 72) || new Set(passwords).size !== accounts.length) {
    throw new Error('Set three distinct local fixture passwords via PC2_ASTER_OWNER, PC2_ASTER_OUTLET and PC2_BIRCH_OWNER.');
  }

  const connection = await verifiedConnection(server, database);
  try {
    await acquireMigrationLock(connection);
    await seed(connection, await Promise.all(passwords.map(password => bcrypt.hash(password, 10))));
    console.log(`Seeded two sample salons, three outlets and three accounts in ${database}.`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error(error.code ?? error.message);
  process.exitCode = 1;
});
