// Run explicitly; the temporary contract is rolled back and its file is removed.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const { sequelize, Contract, Staff, ContractType } = require('../src/models');
const controller = require('../src/controllers/contractDocumentController');
const { metadataFor, documentPath } = require('../src/services/contractDocuments');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
(async () => {
  const originalTransaction = sequelize.transaction.bind(sequelize);
  const originalFind = Contract.findByPk;
  let transaction;
  let uploadedPath;
  try {
    await require('../src/migrations/20261029000004-contract-documents').up(sequelize.getQueryInterface(), require('sequelize').DataTypes);
    transaction = await originalTransaction();
    const staff = await Staff.findOne({ transaction });
    const type = await ContractType.findOne({ transaction });
    assert.ok(staff && type, 'An employee and contract type are needed for this verification.');
    const fixture = await Contract.create({ code: `VERIFY-DOC-${Date.now()}`, title: 'Rollback document verification', employee_id: staff.id, type_id: type.id, start_date: '2099-01-01', status: 'draft' }, { transaction });
    sequelize.transaction = async callback => callback(transaction);
    Contract.findByPk = function (id, options = {}) { return originalFind.call(this, id, { ...options, transaction }); };
    const created = response();
    const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
    await controller.uploadDocument({ params: { id: fixture.id }, user: { id: 1 }, file: { buffer, originalname: 'signed-verification.pdf', mimetype: 'application/pdf' } }, created);
    assert.equal(created.code, 201, created.body?.message);
    const saved = await Contract.findByPk(fixture.id);
    const metadata = metadataFor(saved);
    assert.equal(metadata.name, 'signed-verification.pdf');
    uploadedPath = documentPath(metadata);
    assert.deepEqual(await fs.readFile(uploadedPath), buffer);
    const read = response();
    await controller.getDocument({ params: { id: fixture.id } }, read);
    assert.deepEqual(read.body.document, created.body.document);
    assert.equal(read.body.document.key, undefined);
    const duplicate = response();
    await controller.uploadDocument({ params: { id: fixture.id }, user: { id: 1 }, file: { buffer, originalname: 'another.pdf', mimetype: 'application/pdf' } }, duplicate);
    assert.equal(duplicate.code, 409);
    assert.equal(saved.title, fixture.title);
    console.log('Database document verification passed: persisted file metadata, exact file contents, reload and duplicate protection. Temporary contract and file removed.');
  } finally {
    Contract.findByPk = originalFind;
    sequelize.transaction = originalTransaction;
    if (transaction && !transaction.finished) await transaction.rollback();
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    await sequelize.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
