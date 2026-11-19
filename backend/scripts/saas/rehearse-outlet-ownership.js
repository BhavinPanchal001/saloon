// MySQL rehearsal on an offline, single-business restore. Pass the exact legacy
// outlet IDs so unexpected data never silently acquires an organization.
const { verifiedConnection } = require('./connection');
const migration = '202611190001-organization-outlets';

async function prepareSchema(c) {
  // MySQL commits each DDL statement. Each completed step must survive retry.
  await c.query(`CREATE TABLE IF NOT EXISTS saas_migrations (
    name VARCHAR(160) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  await c.query(`CREATE TABLE IF NOT EXISTS organizations (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL
  ) ENGINE=InnoDB`);
  const [columns] = await c.query("SHOW COLUMNS FROM outlets LIKE 'organization_id'");
  if (!columns.length) {
    await c.query(`ALTER TABLE outlets ADD COLUMN organization_id INT UNSIGNED NULL,
      ADD CONSTRAINT fk_outlets_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)`);
  }
  const [keys] = await c.query(`SELECT 1 FROM information_schema.key_column_usage
    WHERE table_schema=DATABASE() AND table_name='outlets' AND column_name='organization_id'
      AND referenced_table_schema=DATABASE() AND referenced_table_name='organizations' AND referenced_column_name='id'`);
  if (!keys.length) throw new Error('Existing outlet ownership column lacks the required foreign key.');
}

async function apply(c, legacyIds) {
  const [[{ locked }]] = await c.query("SELECT GET_LOCK(CONCAT('saas:', LEFT(SHA2(DATABASE(),256),56)), 5) AS locked");
  if (locked !== 1) throw new Error('A different migration holds the database lock.');
  // Closing this dedicated connection releases the session lock.
  await prepareSchema(c);
  await c.beginTransaction();
  try {
    const [applied] = await c.query('SELECT name FROM saas_migrations WHERE name=?', [migration]);
    if (applied.length) {
      await c.commit();
      return 'already applied';
    }
    const [outlets] = await c.query('SELECT id, organization_id FROM outlets ORDER BY id FOR UPDATE');
    if (outlets.map(o => String(o.id)).join(',') !== legacyIds.join(',')) {
      throw new Error('The supplied legacy outlet list differs from the restored data.');
    }
    const [org] = await c.query('INSERT INTO organizations (slug,name) VALUES (?,?)', ['glowy','Glowy']);
    if (outlets.some(o => o.organization_id !== null)) throw new Error('An outlet already has an owner.');
    if (legacyIds.length) {
      const [updated] = await c.query('UPDATE outlets SET organization_id=? WHERE id IN (?) AND organization_id IS NULL', [org.insertId, legacyIds]);
      if (updated.affectedRows !== legacyIds.length) throw new Error('Incomplete outlet assignment.');
    }
    await c.query('INSERT INTO saas_migrations (name) VALUES (?)', [migration]);
    await c.commit();
    return 'applied';
  } catch (error) {
    await c.rollback();
    throw error;
  }
}

async function main() {
  const [server, database, ids] = process.argv.slice(2);
  if (ids === undefined || !/^(?:[1-9]\d*(?:,[1-9]\d*)*|none)$/.test(ids)) {
    throw new Error('Supply server:port, database and sorted outlet IDs (or none).');
  }
  const connection = await verifiedConnection(server, database);
  try {
    console.log(migration, await apply(connection, ids === 'none' ? [] : ids.split(',')));
  } finally {
    await connection.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
