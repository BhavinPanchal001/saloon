const { sequelize } = require('../src/models');
const { DataTypes } = require('sequelize');
(async () => {
  await sequelize.authenticate();
  await require('../src/migrations/20261119000000-create-salary-calculations').up(sequelize.getQueryInterface(), DataTypes);
  await require('../src/migrations/20261119000001-create-salary-settings').up(sequelize.getQueryInterface(), DataTypes);
  console.log('Salary calculation table, unique index and shared salary settings table are ready.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
