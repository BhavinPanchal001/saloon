const mysql = require('mysql2/promise');
const configurations = require('../../src/config/database');

async function verifiedConnection(expectedServer, expectedDatabase) {
  const environment = process.env.NODE_ENV || 'development';
  const config = configurations[environment];
  if (!['development', 'test'].includes(environment) || config?.dialect !== 'mysql') {
    throw new Error('The rehearsal requires a development or test MySQL configuration.');
  }
  if (!expectedServer || !expectedDatabase || config.database !== expectedDatabase) {
    throw new Error('Supply the expected server:port and database for this environment.');
  }
  const connection = await mysql.createConnection({
    host: config.host, port: config.port, database: config.database,
    user: config.username, password: config.password,
  });
  try {
    const [[identity]] = await connection.query(
      "SELECT CONCAT(@@hostname, ':', @@port) AS server, DATABASE() AS db"
    );
    if (identity.server !== expectedServer || identity.db !== expectedDatabase) {
      throw new Error('Connected database identity differs from the expected target.');
    }
    return connection;
  } catch (error) {
    await connection.end();
    throw error;
  }
}

// Closing the dedicated migration connection releases this advisory lock.
async function acquireMigrationLock(connection) {
  const [[{ locked }]] = await connection.query(
    "SELECT GET_LOCK(CONCAT('saas:', LEFT(SHA2(DATABASE(),256),56)), 5) AS locked"
  );
  if (locked !== 1) throw new Error('A different migration holds the database lock.');
}

module.exports = { verifiedConnection, acquireMigrationLock };
