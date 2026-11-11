const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mysql = require('mysql2/promise');
const sql = require('msnodesqlv8');
require('../src/config/database');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDirectory = path.resolve(__dirname, '../../.local-db-recovery', `sqlserver-transfer-${stamp}`);
const identifier = value => '[' + String(value).replace(/]/g, ']]') + ']';
const literal = value => "N'" + String(value).replace(/'/g, "''") + "'";
const odbc = value => '{' + String(value).replace(/}/g, '}}') + '}';
const report = { started: new Date().toISOString(), databases: [], warnings: [] };

async function open(database) {
  const connectionString = `Driver=${odbc(process.env.DB_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server')};Server=${odbc(process.env.DB_HOST || '(localdb)\\MSSQLLocalDB')};Database=${odbc(database)};Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;`;
  const connection = await promisify(sql.open)(connectionString);
  return { query: promisify(connection.query.bind(connection)), close: promisify(connection.close.bind(connection)) };
}

function sqlType(column) {
  const type = column.DATA_TYPE.toLowerCase();
  if (type === 'tinyint') return column.COLUMN_TYPE === 'tinyint(1)' ? 'BIT' : 'SMALLINT';
  if (['smallint', 'mediumint', 'int', 'integer'].includes(type)) return 'INT';
  if (type === 'bigint') return /unsigned/.test(column.COLUMN_TYPE) ? 'DECIMAL(20,0)' : 'BIGINT';
  if (['decimal', 'numeric'].includes(type)) {
    if (Number(column.NUMERIC_PRECISION) > 38) throw new Error(`Unsupported decimal precision: ${column.TABLE_NAME}.${column.COLUMN_NAME}`);
    return `DECIMAL(${column.NUMERIC_PRECISION},${column.NUMERIC_SCALE})`;
  }
  if (['float', 'double', 'real'].includes(type)) return 'FLOAT';
  if (type === 'date') return 'DATE';
  if (['datetime', 'timestamp'].includes(type)) return 'DATETIME2(6)';
  if (type === 'time') return 'TIME(6)';
  if (type === 'year') return 'SMALLINT';
  if (type === 'bit') return Number(column.NUMERIC_PRECISION) === 1 ? 'BIT' : 'VARBINARY(8)';
  if (['blob', 'tinyblob', 'mediumblob', 'longblob', 'binary', 'varbinary'].includes(type)) return 'VARBINARY(MAX)';
  if (['enum', 'set'].includes(type)) return 'NVARCHAR(255)';
  if (['char', 'varchar'].includes(type)) return Number(column.CHARACTER_MAXIMUM_LENGTH) <= 4000 ? `NVARCHAR(${column.CHARACTER_MAXIMUM_LENGTH})` : 'NVARCHAR(MAX)';
  if (['text', 'tinytext', 'mediumtext', 'longtext', 'json'].includes(type)) return 'NVARCHAR(MAX)';
  throw new Error(`Unsupported source type ${column.COLUMN_TYPE}`);
}

function columnDefinition(column, adding = false) {
  const name = identifier(column.COLUMN_NAME);
  const type = sqlType(column);
  const identity = /auto_increment/.test(column.EXTRA) ? ' IDENTITY(1,1)' : '';
  let defaultSQL = '';
  const value = column.COLUMN_DEFAULT;
  if (!identity && value != null && value !== 'NULL') {
    if (/^current_timestamp(?:\(\d*\))?$/i.test(value)) defaultSQL = ' DEFAULT SYSUTCDATETIME()';
    else {
      const decoded = /^'.*'$/.test(value) ? value.slice(1, -1).replace(/''/g, "'").replace(/\\'/g, "'") : value;
      defaultSQL = ' DEFAULT ' + literal(decoded);
    }
  }
  return `${name} ${type}${identity} ${adding || column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}${defaultSQL}`;
}

function canonical(value, column) {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value.toString('hex');
  if (['date', 'datetime', 'timestamp'].includes(column.DATA_TYPE)) {
    const text = value instanceof Date ? value.toISOString() : String(value);
    return text.replace('T', ' ').replace(/(?:Z|\+00:00)$/, '').replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').slice(0, column.DATA_TYPE === 'date' ? 10 : 26);
  }
  if (['decimal', 'numeric', 'int', 'integer', 'smallint', 'mediumint', 'bigint', 'tinyint', 'year', 'float', 'double', 'real'].includes(column.DATA_TYPE)) {
    return String(typeof value === 'boolean' ? Number(value) : value).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  return String(value);
}

async function main() {
  fs.mkdirSync(backupDirectory, { recursive: true });
  const source = await mysql.createConnection({
    host: process.env.MYSQL_SOURCE_HOST || '127.0.0.1', port: Number(process.env.MYSQL_SOURCE_PORT || 3306),
    user: process.env.MYSQL_SOURCE_USER || 'root', password: process.env.MYSQL_SOURCE_PASSWORD || '',
    dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
  });
  const snapshots = [];
  try {
    await source.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await source.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    const [databases] = await source.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN ('mysql','information_schema','performance_schema','sys','phpmyadmin','test') ORDER BY SCHEMA_NAME");
    for (const { SCHEMA_NAME: database } of databases) {
      const [objects] = await source.query('SELECT TABLE_NAME, TABLE_TYPE, AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME', [database]);
      const [routines] = await source.query('SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?', [database]);
      const [triggers] = await source.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?', [database]);
      if (routines.length || triggers.length || objects.some(object => object.TABLE_TYPE !== 'BASE TABLE')) throw new Error(`${database} has views, triggers or stored routines requiring explicit conversion.`);
      const snapshot = { database, tables: [] };
      for (const object of objects) {
        const table = object.TABLE_NAME;
        const [columns] = await source.query('SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION', [database, table]);
        const [indexes] = await source.query('SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY INDEX_NAME, SEQ_IN_INDEX', [database, table]);
        const [foreignKeys] = await source.query('SELECT * FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION', [database, table]);
        const [rows] = await source.query('SELECT * FROM ??.??', [database, table]);
        const [ddl] = await source.query('SHOW CREATE TABLE ??.??', [database, table]);
        columns.forEach(sqlType);
        for (const column of columns.filter(column => sqlType(column) === 'INT')) {
          if (rows.some(row => row[column.COLUMN_NAME] != null && (BigInt(row[column.COLUMN_NAME]) < -2147483648n || BigInt(row[column.COLUMN_NAME]) > 2147483647n))) {
            throw new Error(`${database}.${table}.${column.COLUMN_NAME} needs a wider SQL Server integer type before copying.`);
          }
        }
        snapshot.tables.push({ name: table, columns, indexes, foreignKeys, rows, ddl: ddl[0]['Create Table'], nextId: object.AUTO_INCREMENT });
      }
      fs.writeFileSync(path.join(backupDirectory, `${database}.json`), JSON.stringify(snapshot, null, 2));
      snapshots.push(snapshot);
      console.log(`Exported ${database}: ${snapshot.tables.length} tables, ${snapshot.tables.reduce((sum, table) => sum + table.rows.length, 0)} rows.`);
    }
    await source.commit();
  } finally { await source.end(); }

  if (!process.argv.includes('--apply')) {
    console.log(`Export completed without changing SQL Server. Backups: ${backupDirectory}`);
    console.log('To replace destination data with the source snapshot, run again with --apply. Destination databases are backed up before replacement.');
    return;
  }

  const master = await open('master');
  try {
    for (const snapshot of snapshots) {
      const { database } = snapshot;
      const existing = await master.query('SELECT name FROM sys.databases WHERE name=?', [database]);
      if (existing.length) {
        const filename = path.join(backupDirectory, `${database}-before.bak`);
        await master.query(`BACKUP DATABASE ${identifier(database)} TO DISK=${literal(filename)} WITH COPY_ONLY, INIT`);
        console.log(`Backed up destination ${database}.`);
      } else await master.query(`CREATE DATABASE ${identifier(database)}`);
      const destination = await open(database);
      const result = { database, tables: [], foreignKeyWarnings: [] };
      try {
        await destination.query('SET XACT_ABORT ON; BEGIN TRANSACTION');
        const tables = await destination.query('SELECT name FROM sys.tables');
        for (const { name } of tables) await destination.query(`ALTER TABLE ${identifier(name)} NOCHECK CONSTRAINT ALL`);
        for (const table of snapshot.tables) {
          const exists = tables.some(existingTable => existingTable.name.toLowerCase() === table.name.toLowerCase());
          if (!exists) {
            const primary = table.indexes.filter(index => index.INDEX_NAME === 'PRIMARY').map(index => identifier(index.COLUMN_NAME));
            const definitions = table.columns.map(column => columnDefinition(column));
            if (primary.length) definitions.push(`PRIMARY KEY (${primary.join(',')})`);
            await destination.query(`CREATE TABLE ${identifier(table.name)} (${definitions.join(',')})`);
          } else {
            const columns = await destination.query('SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(?)', [table.name]);
            for (const column of table.columns) {
              if (!columns.some(existingColumn => existingColumn.name.toLowerCase() === column.COLUMN_NAME.toLowerCase())) await destination.query(`ALTER TABLE ${identifier(table.name)} ADD ${columnDefinition(column, true)}`);
            }
          }
        }
        // The previous SQL Server setup contained a placeholder guest. Replace rows
        // atomically with the complete source snapshot after backing up the database.
        for (const { name } of tables) await destination.query(`DELETE FROM ${identifier(name)}`);
        for (const table of snapshot.tables) {
          const identity = table.columns.find(column => /auto_increment/.test(column.EXTRA));
          if (identity) await destination.query(`SET IDENTITY_INSERT ${identifier(table.name)} ON`);
          try {
            const fields = table.columns.map(column => column.COLUMN_NAME);
            const statement = `INSERT INTO ${identifier(table.name)} (${fields.map(identifier).join(',')}) VALUES (${fields.map(() => '?').join(',')})`;
            for (const row of table.rows) await destination.query(statement, fields.map(field => row[field]));
          } finally {
            if (identity) await destination.query(`SET IDENTITY_INSERT ${identifier(table.name)} OFF`);
          }
          if (identity && table.rows.length) {
            const max = table.rows.reduce((value, row) => BigInt(row[identity.COLUMN_NAME]) > value ? BigInt(row[identity.COLUMN_NAME]) : value, 0n);
            const next = table.nextId ? BigInt(table.nextId) - 1n : max;
            await destination.query(`DBCC CHECKIDENT (${literal(table.name)}, RESEED, ${next > max ? next : max}) WITH NO_INFOMSGS`);
          }
          const copied = await destination.query(`SELECT ${table.columns.map(column => identifier(column.COLUMN_NAME) + ' AS ' + identifier(column.COLUMN_NAME)).join(',')} FROM ${identifier(table.name)}`);
          const key = row => JSON.stringify(table.columns.map(column => canonical(row[column.COLUMN_NAME], column)));
          const expected = table.rows.map(key).sort();
          const actual = copied.map(key).sort();
          if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            const column = table.columns.find(column => JSON.stringify(table.rows.map(row => canonical(row[column.COLUMN_NAME], column)).sort()) !== JSON.stringify(copied.map(row => canonical(row[column.COLUMN_NAME], column)).sort()));
            throw new Error(`Verification failed: ${database}.${table.name}${column ? '.' + column.COLUMN_NAME : ''}`);
          }
          result.tables.push({ table: table.name, sourceRows: table.rows.length, destinationRows: copied.length, verified: true });
        }
        // Copy source indexes, including nullable unique keys using filtered indexes.
        for (const table of snapshot.tables) {
          const indexes = await destination.query('SELECT name FROM sys.indexes WHERE object_id=OBJECT_ID(?)', [table.name]);
          const groups = Object.groupBy(table.indexes.filter(index => index.INDEX_NAME !== 'PRIMARY'), index => index.INDEX_NAME);
          for (const [name, fields] of Object.entries(groups)) {
            if (indexes.some(index => index.name === name)) continue;
            const unique = !fields[0].NON_UNIQUE;
            const nulls = fields.filter(field => table.columns.find(column => column.COLUMN_NAME === field.COLUMN_NAME).IS_NULLABLE === 'YES');
            const filter = unique && nulls.length ? ' WHERE ' + nulls.map(field => identifier(field.COLUMN_NAME) + ' IS NOT NULL').join(' AND ') : '';
            await destination.query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${identifier(name)} ON ${identifier(table.name)} (${fields.map(field => identifier(field.COLUMN_NAME)).join(',')})${filter}`);
          }
        }
        for (const table of snapshot.tables) {
          const existingKeys = await destination.query('SELECT name, parent_column_id FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id=fkc.constraint_object_id WHERE fk.parent_object_id=OBJECT_ID(?)', [table.name]);
          const groups = Object.groupBy(table.foreignKeys, key => key.CONSTRAINT_NAME);
          for (const [name, fields] of Object.entries(groups)) {
            if (fields.some(field => field.REFERENCED_TABLE_SCHEMA !== database)) throw new Error('Cross-database foreign key requires manual conversion.');
            const fkName = `${table.name}_${name}`.slice(0, 128);
            if (existingKeys.some(key => key.name === name || key.name === fkName)) continue;
            await destination.query(`ALTER TABLE ${identifier(table.name)} WITH NOCHECK ADD CONSTRAINT ${identifier(fkName)} FOREIGN KEY (${fields.map(field => identifier(field.COLUMN_NAME)).join(',')}) REFERENCES ${identifier(fields[0].REFERENCED_TABLE_NAME)} (${fields.map(field => identifier(field.REFERENCED_COLUMN_NAME)).join(',')})`);
          }
        }
        const constraints = await destination.query('SELECT name, OBJECT_NAME(parent_object_id) AS table_name FROM sys.foreign_keys UNION ALL SELECT name, OBJECT_NAME(parent_object_id) AS table_name FROM sys.check_constraints');
        for (const constraint of constraints) {
          // Validate when possible; retain historical orphan rows rather than losing data.
          await destination.query(`ALTER TABLE ${identifier(constraint.table_name)} CHECK CONSTRAINT ${identifier(constraint.name)}`);
          const violations = await destination.query(`DBCC CHECKCONSTRAINTS (${literal(constraint.name)}) WITH ALL_ERRORMSGS`);
          if (violations.length) result.foreignKeyWarnings.push({ table: constraint.table_name, constraint: constraint.name, violations: violations.length });
          else await destination.query(`ALTER TABLE ${identifier(constraint.table_name)} WITH CHECK CHECK CONSTRAINT ${identifier(constraint.name)}`);
        }
        await destination.query('COMMIT TRANSACTION');
        report.databases.push(result);
        fs.writeFileSync(path.join(backupDirectory, 'report.json'), JSON.stringify(report, null, 2));
        console.log(`Verified and committed ${database}: ${result.tables.length} tables, ${result.tables.reduce((sum, table) => sum + table.destinationRows, 0)} rows; ${result.foreignKeyWarnings.length} historical relationship warnings.`);
      } catch (error) {
        try { await destination.query('IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION'); } catch (_) {}
        throw error;
      } finally { await destination.close(); }
    }
  } finally { await master.close(); }
  report.completed = new Date().toISOString();
  fs.writeFileSync(path.join(backupDirectory, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Migration complete. Backups and verification report: ${backupDirectory}`);
}

main().catch(error => {
  report.error = error.message;
  fs.writeFileSync(path.join(backupDirectory, 'report.json'), JSON.stringify(report, null, 2));
  console.error('Copy failed:', error.message);
  process.exitCode = 1;
});
