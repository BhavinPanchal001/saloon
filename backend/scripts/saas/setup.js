const fs = require('node:fs');
const path = require('node:path');
const { verifiedConnection, acquireMigrationLock } = require('./connection');
const { applyOutletOwnership } = require('./rehearse-outlet-ownership');
const { baselineMigration, membershipMigration } = require('../../src/saas/schema');

const checkpoint = fs.readFileSync(path.join(__dirname, 'mysql-baseline.sql'), 'utf8')
  .replace(/^--[^\n]*\n/, '').trim().slice(0, -1).split(/;\s*\n\s*(?=CREATE TABLE)/);
const expectedTables = checkpoint.map(ddl => ddl.match(/^CREATE TABLE IF NOT EXISTS `([\w]+)`/)[1]);
const extraTables = new Set(['organizations', 'saas_migrations', 'organization_memberships']);

async function installCheckpoint(connection) {
  // Foreign keys refer to tables later in the snapshot. This session inserts no data.
  await connection.query('SET SESSION FOREIGN_KEY_CHECKS=0');
  try {
    for (const ddl of checkpoint) await connection.query(ddl);
  } finally {
    await connection.query('SET SESSION FOREIGN_KEY_CHECKS=1');
  }
}

async function ensureLookupIndex(connection, table, name, columns) {
  const [indexes] = await connection.query('SHOW INDEX FROM ??', [table]);
  const existing = indexes.filter(index => index.Key_name === name)
    .sort((a, b) => a.Seq_in_index - b.Seq_in_index);
  if (existing.length) {
    if (existing.map(index => index.Column_name).join(',') !== columns.join(',')) {
      throw new Error(`Unexpected definition of ${table}.${name}`);
    }
    return;
  }
  const placeholders = columns.map(() => '??').join(', ');
  await connection.query(`ALTER TABLE ?? ADD INDEX ?? (${placeholders})`, [table, name, ...columns]);
}

async function setup(connection, mode, legacyIds) {
  const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = ?', ['BASE TABLE']);
  const tableNames = new Set(tables.map(row => Object.values(row)[0]));
  if ([...tableNames].some(name => !expectedTables.includes(name) && !extraTables.has(name))) {
    throw new Error('Unexpected tables in the target schema. Review the baseline before applying setup.');
  }
  if (mode === 'install') {
    for (const name of tableNames) {
      if (extraTables.has(name)) continue;
      const [rows] = await connection.query('SELECT 1 FROM ?? LIMIT 1', [name]);
      if (rows.length) throw new Error('Install requires an empty database. Use upgrade for a legacy restore.');
    }
    await installCheckpoint(connection);
  } else if (expectedTables.some(name => !tableNames.has(name))) {
    throw new Error('Upgrade requires all legacy baseline tables.');
  }

  const status = await applyOutletOwnership(connection, legacyIds);
  await ensureLookupIndex(connection, 'customers', 'customers_phone', ['phone']);
  await ensureLookupIndex(connection, 'appointments', 'appointments_outlet_date', ['outlet_id', 'appointment_date']);
  await connection.query('INSERT INTO saas_migrations (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name', [baselineMigration]);
  await connection.query(`CREATE TABLE IF NOT EXISTS organization_memberships (
    organization_id INT UNSIGNED NOT NULL,
    admin_id INT UNSIGNED NOT NULL,
    role ENUM('owner', 'member') NOT NULL,
    outlet_id INT UNSIGNED NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (organization_id, admin_id),
    CONSTRAINT fk_membership_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_membership_admin FOREIGN KEY (admin_id) REFERENCES admins(id),
    CONSTRAINT fk_membership_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    CONSTRAINT chk_membership_outlet CHECK (
      (role = 'owner' AND outlet_id IS NULL) OR (role = 'member' AND outlet_id IS NOT NULL)
    )
  ) ENGINE=InnoDB`);
  await connection.query('INSERT INTO saas_migrations (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name', [membershipMigration]);
  return status;
}

async function main() {
  const [server, database, mode, ids] = process.argv.slice(2);
  const installing = mode === 'install' && ids === undefined;
  const upgrading = mode === 'upgrade' && /^(?:[1-9]\d*(?:,[1-9]\d*)*|none)$/.test(ids ?? '');
  if (!installing && !upgrading) {
    throw new Error('Usage: setup.js <server:port> <database> install | upgrade <legacy outlet IDs or none>');
  }
  const connection = await verifiedConnection(server, database);
  try {
    await acquireMigrationLock(connection);
    const status = await setup(connection, mode, ids && ids !== 'none' ? ids.split(',') : []);
    console.log(`SaaS schema ready (outlet ownership ${status}).`);
  } finally {
    await connection.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
