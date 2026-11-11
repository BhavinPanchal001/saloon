const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
let saved;
let committed;
const transaction = { LOCK: { UPDATE: 'UPDATE' }, finished: false, async commit() { this.finished = true; committed = true; }, async rollback() { this.finished = true; committed = false; } };
const models = {
  Contract: {
    async create(fields) { saved = { ...fields, id: 10, async update(fields) { Object.assign(this, fields); } }; return saved; },
    async findByPk() { return saved && { ...saved, update: saved.update.bind(saved) }; },
    async findOne() { return null; },
    async findAll() { return saved ? [saved] : []; },
  },
  Staff: { async findByPk() { return { id: 1, async update() {} }; } },
  ContractGroup: { async findByPk() { return { id: 1, employee_id: 1, start_date: '2000-01-01', end_date: '2099-12-31' }; } },
  LeaveType: { async findAll() { return [{ id: 1, name: 'Annual Leave', days_allowed: 12, is_paid: true }, { id: 2, name: 'Sick Leave', days_allowed: 14, is_paid: true }]; } },
  HolidayOccasion: { async findAll() { return [{ id: 3, occasion_name: 'New Year', start_date: '2027-01-01', end_date: '2027-01-01', occasion_type: 'National' }]; } },
};
const dbPath = require.resolve('../src/models/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { sequelize: { async transaction() { transaction.finished = false; return transaction; } } } };
const modelsPath = require.resolve('../src/models');
require.cache[modelsPath] = { id: modelsPath, filename: modelsPath, loaded: true, exports: models };
const controller = require('../src/controllers/contractController');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const payload = () => ({ title: 'Employment Contract', employeeId: 1, typeId: 1, code: 'TEST-CONTRACT', startDate: '2027-01-01', selectedLeaves: ['1', '2'], leaveCounts: { 1: 18, 2: 7 }, selectedHolidays: ['3'] });
beforeEach(() => { saved = null; mappings = []; committed = false; });

test('create controller writes selected leaves and custom allowances and GET returns them', async () => {
  const created = response();
  await controller.createOrUpdate({ body: payload() }, created);
  assert.equal(created.code, 200);
  assert.equal(committed, true);
  assert.deepEqual(saved.leave_configuration.map(leave => [leave.id, leave.count]), [[1, 18], [2, 7]]);
  assert.equal(saved.holiday_configuration[0].id, 3);
  const read = response();
  await controller.getOne({ params: { id: 10 } }, read);
  assert.deepEqual(read.body.selectedLeaves, [1, 2]);
  assert.deepEqual(read.body.leaveCounts, { 1: 18, 2: 7 });
  assert.equal(read.body.leaveConfigurationSaved, true);
});

test('create stores an explicit empty selection instead of NULL when policy fields are omitted', async () => {
  const body = payload(); delete body.selectedLeaves; delete body.selectedHolidays;
  const res = response(); await controller.createOrUpdate({ body }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(saved.leave_configuration, []);
  assert.deepEqual(saved.holiday_configuration, []);
});

test('updating a contract replaces selected leaves and preserves them when omitted', async () => {
  await controller.createOrUpdate({ body: payload() }, response());
  const edited = response();
  await controller.createOrUpdate({ body: { ...payload(), id: 10, selectedLeaves: [2], leaveCounts: { 2: 10 } } }, edited);
  assert.equal(edited.code, 200);
  assert.deepEqual(saved.leave_configuration.map(leave => [leave.id, leave.count]), [[2, 10]]);
  const body = { ...payload(), id: 10 }; delete body.selectedLeaves; delete body.selectedHolidays;
  await controller.createOrUpdate({ body }, response());
  assert.deepEqual(saved.leave_configuration.map(leave => [leave.id, leave.count]), [[2, 10]]);
});

test('invalid leave selection rolls back instead of creating a contract with missing allocations', async () => {
  const res = response();
  await controller.createOrUpdate({ body: { ...payload(), selectedLeaves: [999] } }, res);
  assert.equal(res.code, 400);
  assert.equal(committed, false);
  assert.equal(saved, null);
});

test('started contracts reject direct edits without changing their terms', async () => {
  await controller.createOrUpdate({ body: { ...payload(), startDate: '2000-01-01' } }, response());
  const res = response();
  await controller.createOrUpdate({ body: { ...payload(), id: 10, startDate: '2000-01-01', title: 'Changed' } }, res);
  assert.equal(res.code, 409);
  assert.match(res.body.message, /Create Revision/);
  assert.equal(saved.title, 'Employment Contract');
  assert.equal(committed, false);
});

test('revision saves new terms and closes its predecessor before the effective date', async () => {
  await controller.createOrUpdate({ body: { ...payload(), startDate: '2000-01-01', endDate: '2027-12-31' } }, response());
  const predecessor = saved;
  const res = response();
  await controller.createOrUpdate({ body: { ...payload(), groupId: 1, previousContractId: 10, endDate: '2027-12-31', title: 'Revised' } }, res);
  assert.equal(res.code, 200);
  assert.equal(committed, true);
  assert.equal(predecessor.end_date, '2026-12-31');
  assert.equal(predecessor.original_end_date, '2027-12-31');
  assert.equal(predecessor.title, 'Employment Contract');
  assert.equal(saved.previous_contract_id, 10);
  assert.equal(saved.current_version, 2);
  assert.equal(saved.title, 'Revised');
});

