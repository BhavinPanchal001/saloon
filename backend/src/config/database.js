const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const dialect = process.env.DB_DIALECT || 'mssql';
const database = process.env.DB_NAME || 'glowy_salon2';
const host = process.env.DB_HOST || '(localdb)\\MSSQLLocalDB';
const driver = process.env.DB_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server';
const quote = value => '{' + String(value).replace(/}/g, '}}') + '}';
function configuration(name) {
  const config = { username: process.env.DB_USER || '', password: process.env.DB_PASSWORD || '', database: name, host, dialect, logging: false, seederStorage: 'sequelize' };
  if (dialect === 'mssql') {
    config.dialectModulePath = path.resolve(__dirname, 'sqlServerDialect.js');
    config.dialectOptions = { options: {
      connectionString: 'Driver=' + quote(driver) + ';Server=' + quote(host) + ';Database=' + quote(name) + ';Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;',
      trustedConnection: true, instanceName: ''
    } };
  } else { config.port = Number(process.env.DB_PORT || 3306); }
  return config;
}
module.exports = { development: configuration(database), test: configuration(process.env.DB_TEST_NAME || database + '_test'), production: configuration(database) };
