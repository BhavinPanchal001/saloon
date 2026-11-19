'use strict';
module.exports = {
  async up(qi, S) {
    const tables = (await qi.showAllTables()).map(t => typeof t === 'string' ? t : t.tableName);
    if (!tables.includes('salary_calculations')) {
      const integer = qi.sequelize.getDialect() === 'mssql' ? S.INTEGER : S.INTEGER.UNSIGNED;
      await qi.createTable('salary_calculations', {
        id: { type: integer, primaryKey: true, autoIncrement: true }, staff_id: { type: integer, allowNull: false }, month_key: { type: S.STRING(7), allowNull: false },
        status: { type: S.STRING(20), allowNull: false, defaultValue: 'draft' }, revision: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        snapshot: { type: S.TEXT('long'), allowNull: false }, source_hash: { type: S.STRING(64), allowNull: false }, created_by: { type: integer, allowNull: false }, updated_by: { type: integer, allowNull: false },
        finalized_at: { type: S.DATE, allowNull: true }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
      });
    }
    const indexes = await qi.showIndex('salary_calculations');
    if (!indexes.some(i => i.name === 'salary_calculations_employee_month')) await qi.addIndex('salary_calculations', ['staff_id', 'month_key'], { unique: true, name: 'salary_calculations_employee_month' });
  },
  async down(qi) { await qi.dropTable('salary_calculations'); },
};
