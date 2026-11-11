module.exports = {
  async up(q, S) {
    for (const [table, name, type] of [['bill_line_items', 'stock_requirements', S.JSON], ['bills', 'request_hash', S.STRING(64)]]) {
      if (!(await q.describeTable(table))[name]) await q.addColumn(table, name, { type, allowNull: true });
    }
  },
  async down() { throw new Error('Conversion and request snapshots must be retained for existing sales.'); },
};
