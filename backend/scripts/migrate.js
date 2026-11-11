const { spawnSync } = require('child_process');
const config = require('../src/config/database')[process.env.NODE_ENV || 'development'];
const undo = process.argv.includes('--undo');
if (config.dialect === 'mssql') {
  if (undo) {
    console.error('SQL Server setup is additive. Automatic rollback is unavailable; use a database backup to restore an earlier schema.');
    process.exitCode = 1;
  } else {
    require('./setup-sqlserver');
  }
} else {
  const result = spawnSync(process.execPath, [require.resolve('sequelize-cli/lib/sequelize'), undo ? 'db:migrate:undo' : 'db:migrate'], {
    cwd: require('path').resolve(__dirname, '..'), stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
}
