'use strict';
module.exports = {
  async up(qi, S) {
    const tables = await qi.showAllTables();
    if (tables.includes('contracts')) {
      const columns = await qi.describeTable('contracts');
      for (const [name, type] of [['previous_contract_id', S.INTEGER.UNSIGNED], ['original_end_date', S.DATEONLY], ['terms_snapshot', S.JSON]]) {
        if (!columns[name]) await qi.addColumn('contracts', name, { type, allowNull: true });
      }
    }
  },
  async down(qi) {
    for (const name of ['previous_contract_id', 'original_end_date', 'terms_snapshot']) await qi.removeColumn('contracts', name);
  },
};
