// Clone schema only, run rollback fixtures in a unique database, then remove that test database.
const mysql = require('mysql2/promise');
const { spawnSync } = require('child_process');
const { randomBytes } = require('crypto');
const path = require('path');
const fs = require('fs');
const config = require('../src/config/database')[process.env.NODE_ENV || 'development'];
const identifier = (value) => '`' + String(value).replace(/`/g, '``') + '`';
(async () => {
  const testDatabase = `glowy_audit_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const connection = await mysql.createConnection({ host: config.host, port: config.port, user: config.username, password: config.password });
  let created = false;
  try {
    await connection.query(`CREATE DATABASE ${identifier(testDatabase)}`); created = true;
    await connection.query(`USE ${identifier(testDatabase)}`);
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    const [tables] = await connection.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=?', [config.database, 'BASE TABLE']);
    for (const table of tables) {
      const [rows] = await connection.query(`SHOW CREATE TABLE ${identifier(config.database)}.${identifier(table.TABLE_NAME)}`);
      await connection.query(rows[0]['Create Table']);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    await connection.query("INSERT INTO outlets (name,code,city,created_at,updated_at) VALUES ('Audit test outlet','AUDIT-ONLY','Test',NOW(),NOW())");
    await connection.query("INSERT INTO products (item_name,barcode,unit_price,created_at,updated_at) VALUES ('Audit lock fixture','AUDIT-LOCK-FIXTURE',1,NOW(),NOW())");
    console.log('Running inventory tests in an isolated schema (no business rows copied).');
    const files = fs.readdirSync(path.join(__dirname, '../tests')).filter((file) => file.endsWith('.test.js')).map((file) => path.join(__dirname, '../tests', file));
    const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
      cwd: path.join(__dirname, '..'), stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development', DB_NAME: testDatabase },
    });
    process.exitCode = result.status ?? 1;
    if (result.error) throw result.error;
  } finally {
    // Never drop a pre-existing database, even if setup failed.
    if (created && /^glowy_audit_\d+_[0-9a-f]{8}$/.test(testDatabase)) await connection.query(`DROP DATABASE ${identifier(testDatabase)}`);
    await connection.end();
  }
})().catch((error) => { console.error('Isolated inventory verification failed:', error.message); process.exitCode = 1; });
