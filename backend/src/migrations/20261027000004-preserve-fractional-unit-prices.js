module.exports = {
  async up(q, S) {
    await q.changeColumn('bill_line_items', 'price', { type: S.DECIMAL(18, 6), allowNull: false });
  },
  async down() { throw new Error('Reducing price precision would change saved invoices. Restore a backup instead.'); },
};
