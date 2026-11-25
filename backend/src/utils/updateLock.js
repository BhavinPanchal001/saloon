// Sequelize's SQL Server dialect uses table hints instead of SELECT FOR UPDATE.
module.exports = transaction => ({
  transaction,
  lock: transaction.LOCK.UPDATE,
  tableHint: 'UPDLOCK',
});
