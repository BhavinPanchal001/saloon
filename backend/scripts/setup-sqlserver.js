const { sequelize, UnitMaster } = require('../src/models');

(async () => {
  try {
    if (sequelize.getDialect() !== 'mssql') throw new Error('Set DB_DIALECT=mssql in backend/.env first.');
    await sequelize.authenticate();
    await require('../src/services/sqlServerSchema').initializeSqlServer();
    if (process.argv.includes('--seed-units')) {
      const qi = sequelize.getQueryInterface();
      if (await UnitMaster.count() === 0) {
        await require('../src/seeders/20260101000002-seed-unit-masters').up(qi);
      }
    }
    console.log('Connected to SQL Server and initialized the database successfully.');
  } catch (error) {
    console.error('SQL Server setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
