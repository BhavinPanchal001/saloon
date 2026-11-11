module.exports = {
  async up(q, S) {
    const columns = await q.describeTable('bills');
    if (!columns.request_key) await q.addColumn('bills', 'request_key', { type: S.STRING(64), allowNull: true, unique: true });
    await q.sequelize.query("UPDATE products SET barcode = CONCAT('GLP-', id, '-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 8))) WHERE barcode IS NULL OR barcode = ''");
  },
  async down(q) { await q.removeColumn('bills', 'request_key'); },
};
