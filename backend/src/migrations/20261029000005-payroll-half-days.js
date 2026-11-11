'use strict';
module.exports = {
  async up(qi, S) {
    if (!(await qi.showAllTables()).includes('processed_payroll_details')) return;
    const columns = await qi.describeTable('processed_payroll_details');
    for (const name of ['present_days', 'absent_days']) {
      if (columns[name] && !/^DECIMAL\(5,1\)/i.test(columns[name].type.replace(/\s/g, ''))) {
        await qi.changeColumn('processed_payroll_details', name, { type: S.DECIMAL(5, 1).UNSIGNED, allowNull: false, defaultValue: 0 });
      }
    }
  },
  async down() {
    // Preserve fractional attendance in saved payroll history.
  },
};
