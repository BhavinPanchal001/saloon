const express = require('express');
const crypto = require('crypto');
const { Op, Transaction } = require('sequelize');
const { authenticate, requireBusinessAdmin } = require('../middleware/auth');
const { sequelize, Staff, Contract, Shift, WorkWeek, Attendance, LeaveRequest, SalaryCalculation } = require('../models');
const { calculateSalary, datesInMonth, VERSION } = require('../services/salaryCalculation');
const { localToday } = require('../services/contractTimeline');
const { salarySettings } = require('../services/salarySettings');
function createPayrollRouter(settingsStore = salarySettings) {
const router = express.Router();
router.use(authenticate, (req, res, next) => req.user.userType === 'customer' || req.user.customerId ? res.status(403).json({ message: 'Staff access required.' }) : next(), requireBusinessAdmin);
const fail = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
const wrap = fn => async (req, res) => { try { await fn(req, res); } catch (e) {
  const conflict = e.name === 'SequelizeUniqueConstraintError' || [1205, 1213].includes(e.original?.number) || ['ER_LOCK_DEADLOCK', '40001'].includes(e.original?.code);
  if (!e.status && !conflict) console.error('Payroll:', e);
  res.status(e.status || (conflict ? 409 : 500)).json({ message: e.status ? e.message : conflict ? 'Another calculation changed this period. Reload and try again.' : 'Unable to process salary calculation.' });
} };
const plain = value => JSON.parse(JSON.stringify(value));
function saved(row) { return { id: row.id, staffId: row.staff_id, month: row.month_key, status: row.status, revision: row.revision, updatedAt: row.updatedAt, finalizedAt: row.finalized_at, calculation: JSON.parse(row.snapshot) }; }
async function source(staffId, month, transaction) {
  if (!Number.isSafeInteger(Number(staffId)) || Number(staffId) <= 0) fail('Select a valid employee.');
  const days = datesInMonth(month), start = days[0], end = days.at(-1);
  const employee = await Staff.findByPk(staffId, { attributes: ['id', 'first_name', 'last_name', 'employee_code', 'assigned_outlet_id', 'joining_date'], transaction });
  if (!employee) fail('Employee not found.', 404);
  const contracts = await Contract.findAll({ where: { employee_id: staffId, start_date: { [Op.lte]: end }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: start } }] }, include: [{ model: Shift, as: 'shift' }, { model: WorkWeek, as: 'workWeek' }], order: [['id', 'ASC']], transaction });
  const attendance = await Attendance.findAll({ where: { staff_id: staffId, date: { [Op.between]: [start, end] } }, order: [['date', 'ASC'], ['id', 'ASC']], transaction });
  const leaves = await LeaveRequest.findAll({ where: { staff_id: staffId, start_date: { [Op.lte]: end }, end_date: { [Op.gte]: start } }, order: [['id', 'ASC']], transaction });
  const input = plain({ staff: employee, contracts, attendance, leaves });
  const settings = await settingsStore.get(transaction);
  if (!settings.configured) fail('Configure Salary Settings in Settings before calculating salary.');
  return { input, settings, hash: crypto.createHash('sha256').update(JSON.stringify({ version: VERSION, input, settingsRevision: settings.revision, policy: settings.policy })).digest('hex') };
}
router.get('/settings', wrap(async (_req, res) => { res.json(await settingsStore.get()); }));
router.put('/settings', wrap(async (req, res) => { res.json(await settingsStore.save(req.body, req.user.id)); }));
router.get('/', wrap(async (req, res) => {
  const days = datesInMonth(req.query.month);
  const contracts = await Contract.findAll({ attributes: ['employee_id'], where: { status: 'active', start_date: { [Op.lte]: days.at(-1) }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: days[0] } }] } });
  const results = await SalaryCalculation.findAll({ where: { month_key: req.query.month } });
  const ids = [...new Set([...contracts.map(c => c.employee_id), ...results.map(r => r.staff_id)])];
  const staff = ids.length ? await Staff.findAll({ attributes: ['id', 'employee_code', 'first_name', 'last_name', 'assigned_outlet_id'], where: { id: ids }, order: [['first_name', 'ASC']] }) : [];
  res.json(staff.map(s => { const row = results.find(r => r.staff_id === s.id); const calculation = row ? JSON.parse(row.snapshot) : null; return { id: s.id, name: `${s.first_name} ${s.last_name}`, code: s.employee_code || String(s.id), outletId: s.assigned_outlet_id, status: row?.status || 'not_calculated', revision: row?.revision || 0, totals: calculation?.totals || null, issueCount: calculation?.issues?.length || 0 }; }));
}));
router.get('/:staffId', wrap(async (req, res) => {
  datesInMonth(req.query.month);
  const row = await SalaryCalculation.findOne({ where: { staff_id: req.params.staffId, month_key: req.query.month } });
  if (!row) return res.json(null);
  res.json(saved(row));
}));
router.post('/:staffId/preview', wrap(async (req, res) => {
  const data = await source(req.params.staffId, req.body.month);
  const calculation = { ...calculateSalary({ ...data.input, month: req.body.month, policy: data.settings.policy, adjustments: req.body.adjustments || [] }), salarySettings: { revision: data.settings.revision, updatedAt: data.settings.updatedAt, updatedBy: data.settings.updatedBy } };
  res.json({ calculation, sourceHash: data.hash });
}));
router.post('/:staffId/save', wrap(async (req, res) => {
  const { month, adjustments = [], revision, sourceHash, finalize = false } = req.body;
  if (typeof finalize !== 'boolean' || !Number.isSafeInteger(revision) || revision < 0 || typeof sourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(sourceHash)) fail('Reload the calculation before saving.');
  const result = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
    const existing = await SalaryCalculation.findOne({ where: { staff_id: req.params.staffId, month_key: month }, transaction, lock: transaction.LOCK.UPDATE });
    if (existing?.status === 'finalized') fail('Finalized payroll is locked.', 409);
    if ((existing?.revision || 0) !== revision) fail('Another user changed this calculation. Reload before saving.', 409);
    const data = await source(req.params.staffId, month, transaction);
    if (data.hash !== sourceHash) fail('Contract, attendance, leave or Salary Settings changed. Recalculate before saving.', 409);
    const calculation = { ...calculateSalary({ ...data.input, month, policy: data.settings.policy, adjustments }), salarySettings: { revision: data.settings.revision, updatedAt: data.settings.updatedAt, updatedBy: data.settings.updatedBy } };
    if (finalize && datesInMonth(month).at(-1) >= localToday()) fail('Only completed months can be finalized.');
    if (finalize && calculation.issues.length) fail('Resolve all calculation issues before finalizing.');
    const payload = { staff_id: Number(req.params.staffId), month_key: month, status: finalize ? 'finalized' : 'draft', revision: revision + 1, snapshot: JSON.stringify({ ...calculation, sources: data.input }), source_hash: data.hash, updated_by: req.user.id, finalized_at: finalize ? new Date() : null };
    let row;
    if (existing) {
      const [affected] = await SalaryCalculation.update(payload, { where: { id: existing.id, revision, status: 'draft' }, returning: sequelize.getDialect() === 'mssql', transaction });
      if (affected !== 1) fail('Another user changed this calculation. Reload before saving.', 409);
      row = await SalaryCalculation.findByPk(existing.id, { transaction });
    } else row = await SalaryCalculation.create({ ...payload, created_by: req.user.id }, { transaction });
    return saved(row);
  });
  res.json(result);
}));
return router;
}
module.exports = createPayrollRouter();
module.exports.createPayrollRouter = createPayrollRouter;
