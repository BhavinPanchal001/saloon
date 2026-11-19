const express = require('express');
const { Op, Transaction } = require('sequelize');
const { authenticate, requireBusinessAdmin } = require('../middleware/auth');
const { sequelize, Staff, Contract, WorkWeek, LeaveType, LeaveRequest, Attendance } = require('../models');
const { calculateLeave, validDate, fail } = require('../services/leaveValidation');
const { localToday, contractForDate } = require('../services/contractTimeline');
const { validateApprovedCancellation } = require('../services/leaveCancellation');
const { assertSalaryPeriodOpen } = require('../services/salaryPeriodLock');
const router = express.Router();
router.use(authenticate);
router.use((req, res, next) => req.user.userType === 'customer' || req.user.customerId ? res.status(403).json({ message: 'Staff access required.' }) : next());
const isAdmin = user => ['admin', 'super_admin'].includes(user.role);
const wrap = fn => async (req, res) => { try { await fn(req, res); } catch (error) { console.error('Leave request:', error); res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to process leave request.' }); } };
const ownStaff = user => Staff.findOne({ where: { user_id: user.id } });
const contractsFor = (staffId, transaction) => Contract.findAll({ where: { employee_id: staffId }, include: [{ model: WorkWeek, as: 'workWeek', required: false }], transaction });
const parseDates = row => { try { return JSON.parse(row.dates); } catch { return []; } };
const amount = row => Number(row.days);
const response = (row, names) => ({ ...row.toJSON(), staffName: names.get(row.staff_id) || `Employee ${row.staff_id}`, workingDates: parseDates(row) });

router.get('/context', wrap(async (req, res) => {
  const staff = await ownStaff(req.user);
  const staffList = isAdmin(req.user) ? await Staff.findAll({ attributes: ['id', 'first_name', 'last_name'], order: [['first_name', 'ASC']] }) : [];
  const staffId = req.query.staffId && isAdmin(req.user) ? Number(req.query.staffId) : staff?.id;
  const date = req.query.date || localToday();
  if (!validDate(date)) fail('Enter a valid date.');
  if (!staffId) return res.json({ staff: null, ownStaffId: staff?.id || null, staffList, contract: null, balances: [] });
  const target = staffId === staff?.id ? staff : await Staff.findByPk(staffId);
  if (!target) fail('Employee not found.');
  const contracts = await contractsFor(staffId);
  const contract = contractForDate(contracts, date);
  if (!contract) return res.json({ staff: target, ownStaffId: staff?.id || null, staffList, contract: null, balances: [] });
  const rows = await LeaveRequest.findAll({ where: { staff_id: staffId, contract_id: contract.id, status: 'approved' } });
  const types = await LeaveType.findAll();
  const balances = (contract.leave_configuration || []).map(a => {
    const type = types.find(t => Number(t.id) === Number(a.id));
    const used = rows.filter(r => Number(r.leave_type_id) === Number(a.id)).reduce((n, r) => n + amount(r), 0);
    return { id: a.id, name: a.name, entitlement: Number(a.count), used, remaining: Math.max(0, Number(a.count) - used), isPaid: a.isPaid, documentRequired: Boolean(type?.needed_document) };
  });
  res.json({ staff: target, ownStaffId: staff?.id || null, staffList, contract: { id: contract.id, code: contract.code, startDate: contract.start_date, endDate: contract.end_date }, balances });
}));

router.get('/', wrap(async (req, res) => {
  const staff = await ownStaff(req.user);
  const all = req.query.all === 'true' && isAdmin(req.user);
  if (!all && !staff) return res.json([]);
  const rows = await LeaveRequest.findAll({ where: all ? {} : { staff_id: staff.id }, order: [['created_at', 'DESC']] });
  const people = await Staff.findAll({ attributes: ['id', 'first_name', 'last_name'], where: { id: [...new Set(rows.map(r => r.staff_id))] } });
  const types = await LeaveType.findAll({ attributes: ['id', 'name'], where: { id: [...new Set(rows.map(r => r.leave_type_id))] } });
  const names = new Map(people.map(p => [p.id, `${p.first_name} ${p.last_name}`]));
  const typeNames = new Map(types.map(t => [t.id, t.name]));
  res.json(rows.map(row => ({ ...response(row, names), leaveTypeName: typeNames.get(row.leave_type_id) || `Leave type ${row.leave_type_id}` })));
}));

async function validate({ staffId, typeId, startDate, endDate, duration, transaction, excludeId, checkNotice }) {
  const staff = await Staff.findByPk(staffId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!staff) fail('Employee not found.');
  const contracts = await contractsFor(staffId, transaction);
  const leaveType = await LeaveType.findByPk(typeId, { transaction });
  if (!leaveType) fail('Leave type not found.');
  const result = calculateLeave({ contracts, leaveType, startDate, endDate, duration, checkNotice });
  await assertSalaryPeriodOpen(staffId, result.dates, transaction);
  if (leaveType.needed_document) fail('This leave type requires a supporting document. Document submission is not yet available.');
  if (duration === 'half' && result.allocation.isPaid) fail('Paid half-day leave is not available until payroll can represent it correctly.');
  const where = { staff_id: staffId, status: { [Op.in]: ['pending', 'approved'] } };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const requests = await LeaveRequest.findAll({ where, transaction });
  if (requests.some(r => parseDates(r).some(d => result.dates.includes(d)))) fail('A pending or approved leave request already covers one of these dates.');
  const approved = requests.filter(r => r.status === 'approved' && r.contract_id === result.contract.id && r.leave_type_id === leaveType.id);
  if (approved.reduce((sum, r) => sum + amount(r), 0) + result.days > Number(result.allocation.count)) fail('The request exceeds the remaining contract entitlement.');
  if (Number(leaveType.max_monthly) > 0) {
    for (const month of new Set(result.dates.map(d => d.slice(0, 7)))) {
      const requested = result.dates.filter(d => d.startsWith(month)).length * (duration === 'half' ? 0.5 : 1);
      const used = approved.reduce((sum, r) => sum + parseDates(r).filter(d => d.startsWith(month)).length * (r.duration === 'half' ? 0.5 : 1), 0);
      if (used + requested > Number(leaveType.max_monthly)) fail(`The monthly limit for ${month} would be exceeded.`);
    }
  }
  const attendance = await Attendance.findAll({ where: { staff_id: staffId, date: { [Op.in]: result.dates } }, transaction });
  if (attendance.some(a => a.status !== 'not_marked' || a.check_in || a.check_out)) fail('Attendance is already recorded for one or more requested dates.');
  return { ...result, leaveType, attendance };
}

router.post('/', wrap(async (req, res) => {
  const own = await ownStaff(req.user);
  if (!isAdmin(req.user) && req.body.staffId && Number(req.body.staffId) !== own?.id) return res.status(403).json({ message: 'You may only request leave for yourself.' });
  const staffId = isAdmin(req.user) && req.body.staffId ? Number(req.body.staffId) : own?.id;
  if (!staffId) fail('Your login is not linked to an employee record.');
  const { leaveTypeId, startDate, endDate, duration, reason } = req.body;
  if (!Number.isSafeInteger(Number(leaveTypeId)) || Number(leaveTypeId) <= 0 || typeof reason !== 'string' || !reason.trim() || reason.length > 2000) fail('Select a leave type and enter a reason (up to 2000 characters).');
  const request = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
    const result = await validate({ staffId, typeId: Number(leaveTypeId), startDate, endDate, duration, transaction, checkNotice: true });
    return LeaveRequest.create({ staff_id: staffId, contract_id: result.contract.id, leave_type_id: leaveTypeId, start_date: startDate, end_date: endDate, duration, days: result.days, dates: JSON.stringify(result.dates), reason: reason.trim(), status: 'pending', created_by: req.user.id }, { transaction });
  });
  res.status(201).json(request);
}));

router.post('/:id/cancel', wrap(async (req, res) => {
  const own = await ownStaff(req.user);
  const reason = req.body?.reason;
  if (reason != null && (typeof reason !== 'string' || reason.length > 2000)) fail('Enter a valid cancellation reason.');
  const request = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
    const row = await LeaveRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) fail('Request not found.');
    if (!isAdmin(req.user) && (!own || Number(row.staff_id) !== Number(own.id))) {
      const error = new Error('You may only cancel your own request.'); error.status = 403; throw error;
    }
    if (!['pending', 'approved'].includes(row.status)) fail('Only pending or approved requests can be cancelled.');
    if (row.status === 'approved') {
      if (!isAdmin(req.user)) { const error = new Error('Only an administrator can cancel approved leave.'); error.status = 403; throw error; }
      if (own && Number(own.id) === Number(row.staff_id)) fail('You cannot cancel your own approved leave. Ask another administrator.');
      if (!reason?.trim()) fail('A reason is required to cancel approved leave.');
      const dates = parseDates(row);
      if (!Array.isArray(dates) || !dates.length || dates.some(date => !validDate(date))) fail('The request dates cannot be verified.');
      await assertSalaryPeriodOpen(row.staff_id, dates, transaction);
      const contract = await Contract.findByPk(row.contract_id, { transaction });
      const allocation = (contract?.leave_configuration || []).find(item => Number(item.id) === Number(row.leave_type_id));
      const records = await Attendance.findAll({ where: { staff_id: row.staff_id, date: { [Op.in]: dates } }, transaction, lock: transaction.LOCK.UPDATE });
      validateApprovedCancellation({ dates, today: localToday(), allocation, duration: row.duration, records });
      for (const record of records) await record.update({ status: 'not_marked' }, { transaction });
    }
    await row.update({ status: 'cancelled', reviewed_by: req.user.id, reviewed_at: new Date(), review_note: reason?.trim() || null }, { transaction });
    return row;
  });
  res.json(request);
}));

router.post('/:id/review', requireBusinessAdmin, wrap(async (req, res) => {
  const { decision, note } = req.body;
  if (!['approved', 'rejected'].includes(decision) || (note != null && (typeof note !== 'string' || note.length > 2000))) fail('Enter a valid decision and review note.');
  const request = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
    const row = await LeaveRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) fail('Request not found.');
    if (row.status !== 'pending') fail('Only pending requests can be reviewed.');
    const reviewer = await ownStaff(req.user);
    if (reviewer && reviewer.id === row.staff_id) fail('You cannot review your own leave request.');
    if (decision === 'approved') {
      const result = await validate({ staffId: row.staff_id, typeId: row.leave_type_id, startDate: row.start_date, endDate: row.end_date, duration: row.duration, transaction, excludeId: row.id, checkNotice: false });
      if (result.contract.id !== row.contract_id || JSON.stringify(result.dates) !== row.dates || result.days !== Number(row.days)) fail('Contract terms changed. Reject this request and ask the employee to submit a new one.');
      for (const date of result.dates) {
        const existing = result.attendance.find(a => a.date === date);
        const status = row.duration === 'half' ? 'half_day' : result.allocation.isPaid ? 'paid_leave' : 'absent';
        if (existing) await existing.update({ status }, { transaction });
        else await Attendance.create({ staff_id: row.staff_id, date, status }, { transaction });
      }
    }
    await row.update({ status: decision, reviewed_by: req.user.id, reviewed_at: new Date(), review_note: note?.trim() || null }, { transaction });
    return row;
  });
  res.json(request);
}));

module.exports = router;
