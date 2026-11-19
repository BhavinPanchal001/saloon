const { sequelize } = require('../models/db');
const { assertSaasSchema } = require('./schema');
const app = require('./app');

async function start() {
  if (!process.env.JWT_SECRET?.trim()) throw new Error('Set JWT_SECRET before starting the SaaS API.');
  await sequelize.authenticate();
  await assertSaasSchema(sequelize);
  const server = app.listen(Number(process.env.PORT || 5111), process.env.SAAS_HOST || '127.0.0.1', () => {
    console.log(`SaaS API listening on ${server.address().port}`);
  });
  server.once('error', async error => {
    console.error(error.message);
    await sequelize.close();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => sequelize.close()));
  }
}

start().catch(async error => {
  console.error(error.original?.code === 'ER_NO_SUCH_TABLE' ? 'Run the explicit SaaS database setup before starting.' : error.message);
  await sequelize.close();
  process.exitCode = 1;
});
