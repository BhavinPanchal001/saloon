'use strict';
module.exports = {
  async up(qi, S) {
    const tables = (await qi.showAllTables()).map(t => typeof t === 'string' ? t : t.tableName);
    if (!tables.includes('salary_settings')) await qi.createTable('salary_settings', {
      id: { type: S.INTEGER, primaryKey: true, allowNull: false }, policy: { type: S.TEXT, allowNull: false }, revision: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      updated_by: { type: S.INTEGER, allowNull: false }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false },
    });
  },
  async down(qi) { await qi.dropTable('salary_settings'); },
};
