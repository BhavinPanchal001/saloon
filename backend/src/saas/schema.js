const baselineMigration = '202611190002-mysql-baseline';
const membershipMigration = '202611190003-organization-memberships';

async function assertSaasSchema(sequelize) {
  if (sequelize.getDialect() !== 'mysql') {
    throw new Error('The SaaS foundation currently supports MySQL.');
  }
  const required = [baselineMigration, membershipMigration];
  const [rows] = await sequelize.query('SELECT name FROM saas_migrations WHERE name IN (?)', {
    replacements: [required],
  });
  if (rows.length !== required.length) throw new Error('Run the explicit SaaS database setup before starting.');
}

module.exports = { baselineMigration, membershipMigration, assertSaasSchema };
