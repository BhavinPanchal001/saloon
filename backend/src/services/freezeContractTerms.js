const { Op } = require('sequelize');
const { Contract, Shift, WorkWeek } = require('../models');
const { snapshotTerms } = require('./contractTerms');
const freezeContractTerms = async () => {
  const contracts = await Contract.findAll({ where: { terms_snapshot: { [Op.is]: null } }, include: [{ model: Shift, as: 'shift' }, { model: WorkWeek, as: 'workWeek' }] });
  for (const contract of contracts) await contract.update({ terms_snapshot: snapshotTerms(contract) });
};
module.exports = { freezeContractTerms };
