const { SalarySetting, sequelize } = require('../models');
const { Transaction } = require('sequelize');
const { validatePolicy } = require('./salaryCalculation');
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
function createSalarySettingsStore(id = 1) {
  const format = row => row ? { configured: true, policy: validatePolicy(JSON.parse(row.policy)), revision: row.revision, updatedAt: row.updatedAt, updatedBy: row.updated_by } : { configured: false, policy: null, revision: 0, updatedAt: null, updatedBy: null };
  return {
    async get(transaction) { return format(await SalarySetting.findByPk(id, { transaction })); },
    async save({ policy: input, revision }, userId) {
      const policy = validatePolicy(input);
      if (!Number.isSafeInteger(revision) || revision < 0) fail('Reload Salary Settings before saving.');
      return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
        const row = await SalarySetting.findByPk(id, { transaction });
        if ((row?.revision || 0) !== revision) fail('Salary Settings changed. Reload before saving.', 409);
        const payload = { policy: JSON.stringify(policy), revision: revision + 1, updated_by: userId };
        if (!row) return format(await SalarySetting.create({ id, ...payload }, { transaction }));
        const [affected] = await SalarySetting.update(payload, { where: { id, revision }, returning: sequelize.getDialect() === 'mssql', transaction });
        if (affected !== 1) fail('Salary Settings changed. Reload before saving.', 409);
        return format(await SalarySetting.findByPk(id, { transaction }));
      });
    },
  };
}
module.exports = { createSalarySettingsStore, salarySettings: createSalarySettingsStore() };
