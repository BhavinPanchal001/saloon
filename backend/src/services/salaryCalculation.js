const Decimal = require('decimal.js');
const { contractForDate, localToday } = require('./contractTimeline');
const { termsFor } = require('./contractTerms');
const VERSION = 'salary-v1';
const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fail = message => { const error = new Error(message); error.status = 400; throw error; };
const money = value => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
const finite = value => { try { const n = new Decimal(value); return n.isFinite() && n.gte(0) && n.lte('1000000000'); } catch { return false; } };
const datesInMonth = month => {
  if (typeof month !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) fail('Select a valid month between 2000 and 2099.');
  const [year, m] = month.split('-').map(Number);
  return Array.from({ length: new Date(Date.UTC(year, m, 0)).getUTCDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};
function validatePolicy(policy) {
  if (!policy || !['calendar', 'working'].includes(policy.divisor) || !['status', 'hours'].includes(policy.shortHours) || !['basic', 'gross'].includes(policy.deductionBase) || typeof policy.prorateFixedDeductions !== 'boolean') fail('Choose the salary divisor, attendance method, percentage deduction basis and fixed deduction policy.');
  return { divisor: policy.divisor, shortHours: policy.shortHours, deductionBase: policy.deductionBase, prorateFixedDeductions: policy.prorateFixedDeductions };
}
function workday(contract, date) {
  const days = termsFor(contract).workWeek?.operational_days;
  if (!Array.isArray(days) || !days.length || days.some(d => !names.includes(d))) return null;
  const holiday = (contract.holiday_configuration || []).find(h => h.startDate <= date && (h.endDate || h.startDate) >= date);
  return { working: days.includes(names[new Date(`${date}T00:00:00Z`).getUTCDay()]) && !holiday, holiday: holiday?.name || null, weeklyOff: !days.includes(names[new Date(`${date}T00:00:00Z`).getUTCDay()]) };
}
function workedMinutes(record) {
  if (!record?.check_in?.timestamp || !record?.check_out?.timestamp) return null;
  const start = Date.parse(record.check_in.timestamp), end = Date.parse(record.check_out.timestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 48 * 3600000) return null;
  let previousEnd = start, breaks = 0;
  if (!Array.isArray(record.breaks || [])) return null;
  for (const item of [...(record.breaks || [])].sort((a, b) => Date.parse(a.in) - Date.parse(b.in))) {
    const a = Date.parse(item.in), b = Date.parse(item.out);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < start || b > end || a < previousEnd || b <= a) return null;
    breaks += (b - a) / 60000; previousEnd = b;
  }
  return Math.max(0, (end - start) / 60000 - breaks);
}
function shiftMinutes(shift) {
  const parse = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) : NaN;
  let span = parse(shift?.end_time) - parse(shift?.start_time);
  if (span <= 0) span += 1440;
  return span - Number(shift?.break_duration || 0);
}
function calculateSalary({ month, staff, contracts, attendance = [], leaves = [], policy: rawPolicy, adjustments = [], today = localToday() }) {
  const dates = datesInMonth(month), policy = validatePolicy(rawPolicy), issues = [], warnings = [];
  const addIssue = value => { if (!issues.includes(value)) issues.push(value); };
  const addWarning = value => { if (!warnings.includes(value)) warnings.push(value); };
  const ledger = [], segments = new Map(), earnings = new Map(), deductions = new Map();
  if (!Array.isArray(adjustments) || adjustments.length > 30) fail('Use at most 30 adjustment lines.');
  for (const item of adjustments) if (!item || !['earning', 'deduction'].includes(item.type) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 150 || typeof item.reason !== 'string' || !item.reason.trim() || item.reason.length > 1000 || !finite(item.amount) || new Decimal(item.amount).decimalPlaces() > 2) fail('Each adjustment needs a type, name, positive amount with at most two decimals and a reason.');
  let gross = new Decimal(0), loss = new Decimal(0), contractDeductions = new Decimal(0), payableUnits = new Decimal(0), totalWorked = 0;
  for (const date of dates) {
    let contract;
    try { contract = contractForDate(contracts, date); } catch { addIssue(`Overlapping contracts on ${date}.`); }
    if (!contract) { ledger.push({ date, status: 'no_contract', factor: 0, contractId: null, workedMinutes: 0, scheduledMinutes: 0, earnings: '0.00', loss: '0.00' }); continue; }
    const terms = termsFor(contract), schedule = workday(contract, date), scheduled = shiftMinutes(terms.shift);
    if (!schedule || !Number.isFinite(scheduled) || scheduled <= 0) addIssue(`Contract ${contract.code}: missing or invalid shift/work week.`);
    if (!segments.has(contract.id)) segments.set(contract.id, { contractId: contract.id, code: contract.code, version: contract.current_version || 1, from: date, to: date, days: 0, scheduledMinutes: scheduled || 0, snapshot: terms, divisor: policy.divisor === 'calendar' ? dates.length : dates.filter(d => workday(contract, d)?.working).length });
    const segment = segments.get(contract.id); segment.to = date; segment.days++;
    if (!segment.divisor) addIssue(`Contract ${contract.code}: the salary divisor is zero.`);
    const records = attendance.filter(r => r.date === date);
    if (records.length > 1) addIssue(`Duplicate attendance on ${date}.`);
    const record = records[0], minutes = workedMinutes(record), matches = [];
    for (const leave of leaves) {
      let workingDates; try { workingDates = typeof leave.dates === 'string' ? JSON.parse(leave.dates) : leave.dates; } catch { workingDates = null; }
      if (!Array.isArray(workingDates)) { addIssue(`Leave request ${leave.id}: invalid working dates.`); continue; }
      if (workingDates.includes(date) && ['approved', 'pending'].includes(leave.status)) matches.push(leave);
    }
    if (matches.some(l => l.status === 'pending')) addIssue(`Pending leave on ${date}; resolve before finalizing.`);
    const approved = matches.filter(l => l.status === 'approved');
    if (approved.length > 1) addIssue(`Overlapping approved leave on ${date}.`);
    let status = record?.status || 'not_marked', factor = 0, leaveName = null;
    const off = schedule && !schedule.working;
    if (off) { status = schedule.holiday ? 'holiday' : 'weekly_off'; factor = 1; if (record?.check_in) addWarning(`Work on an off day (${date}) is shown in hours but has no automatic premium.`); }
    else if (approved.length) {
      const leave = approved[0], allocation = (contract.leave_configuration || []).find(a => Number(a.id) === Number(leave.leave_type_id));
      leaveName = allocation?.name || 'Leave';
      if (Number(leave.contract_id) !== Number(contract.id) || !allocation || typeof allocation.isPaid !== 'boolean') addIssue(`Leave on ${date} does not match its contract allocation.`);
      if (leave.duration !== 'full') addIssue(`Half-day leave on ${date} needs attendance reconciliation before finalization.`);
      status = allocation?.isPaid ? 'paid_leave' : 'unpaid_leave'; factor = allocation?.isPaid ? 1 : 0;
      const expected = allocation?.isPaid ? 'paid_leave' : 'absent';
      if (record?.status !== expected || record?.check_in || record?.check_out) addIssue(`Approved leave and attendance conflict on ${date}.`);
    } else if (status === 'present' || status === 'half_day') {
      factor = policy.shortHours === 'status' ? (status === 'half_day' ? 0.5 : 1) : minutes === null || !scheduled ? 0 : Math.min(1, minutes / scheduled);
      if (minutes === null) addIssue(`Missing or invalid check-in, check-out or breaks on ${date}.`);
    } else if (status === 'paid_leave') { factor = 0; addIssue(`Paid-leave attendance on ${date} has no approved request.`); }
    else if (status === 'absent') factor = 0;
    else { addIssue(`Unmarked or inconsistent working-day attendance on ${date}.`); factor = 0; }
    if (record?.check_in?.sample_data || record?.check_out?.sample_data || matches.some(l => String(l.reason).startsWith('[SAMPLE DATA]'))) addIssue('Sample attendance/leave is present; calculations are for testing and cannot be finalized.');
    if (date > today && schedule?.working) addIssue('The period contains future working days.');
    if (minutes !== null) totalWorked += minutes;
    const unit = policy.divisor === 'calendar' || !off ? new Decimal(1).div(segment.divisor || 1) : new Decimal(0);
    if (!off || policy.divisor === 'calendar') payableUnits = payableUnits.plus(factor);
    const components = terms.salaryComponents;
    if (!Array.isArray(components) || !components.length) addIssue(`Contract ${contract.code}: no historical salary components saved.`);
    const valid = Array.isArray(components) ? components.filter(c => {
      if (!c || !['earning', 'deduction'].includes(c.type) || !['fixed', 'percentage'].includes(c.calculationType) || !finite(c.amount)) { addIssue(`Contract ${contract.code}: invalid salary component.`); return false; }
      return true;
    }) : [];
    const basicComponents = valid.filter(c => c.type === 'earning' && String(c.code).toUpperCase() === 'BASIC' && c.calculationType === 'fixed');
    if (basicComponents.length !== 1) addIssue(`Contract ${contract.code}: exactly one fixed BASIC earning is required.`);
    if (new Set(valid.map(c => String(c.id || c.code || c.name))).size !== valid.length) addIssue(`Contract ${contract.code}: duplicate salary components.`);
    const basic = new Decimal(basicComponents[0]?.amount || 0);
    let dayGross = new Decimal(0);
    for (const c of valid.filter(c => c.type === 'earning')) {
      const monthly = c.calculationType === 'fixed' ? new Decimal(c.amount) : basic.mul(c.amount).div(100);
      const value = monthly.mul(unit); dayGross = dayGross.plus(value);
      const key = `${contract.id}:${c.id || c.code || c.name}`;
      if (!earnings.has(key)) earnings.set(key, { name: c.name, contractCode: contract.code, basis: c.calculationType === 'fixed' ? `Monthly ${money(c.amount)}; ${policy.divisor}-day proration` : `${c.amount}% of monthly BASIC ${money(basic)}; ${policy.divisor}-day proration`, amount: new Decimal(0) });
      earnings.get(key).amount = earnings.get(key).amount.plus(value);
    }
    const dayLoss = dayGross.mul(new Decimal(1).minus(factor));
    gross = gross.plus(dayGross); loss = loss.plus(dayLoss);
    for (const c of valid.filter(c => c.type === 'deduction')) {
      let value;
      if (c.calculationType === 'percentage') value = (policy.deductionBase === 'basic' ? basic.mul(unit).mul(factor) : dayGross.minus(dayLoss)).mul(c.amount).div(100);
      else if (policy.prorateFixedDeductions) value = new Decimal(c.amount).mul(unit);
      else value = new Decimal(c.amount).div(dates.length); // allocate monthly fixed deduction once across active calendar dates
      contractDeductions = contractDeductions.plus(value);
      const key = `${contract.id}:${c.id || c.code || c.name}`;
      if (!deductions.has(key)) deductions.set(key, { name: c.name, contractCode: contract.code, basis: c.calculationType === 'percentage' ? `${c.amount}% of attendance-adjusted ${policy.deductionBase.toUpperCase()}` : `Monthly ${money(c.amount)}; ${policy.prorateFixedDeductions ? policy.divisor + '-day' : 'calendar-day'} proration`, amount: new Decimal(0) });
      deductions.get(key).amount = deductions.get(key).amount.plus(value);
    }
    if (contract.overtime_enabled) addIssue(`Contract ${contract.code}: overtime is enabled but approved overtime inputs/rate basis must be reconciled before finalization.`);
    ledger.push({ date, status, attendanceId: record?.id || null, contractId: contract.id, contractCode: contract.code, leaveName, leaveRequestIds: matches.map(l => l.id), factor: Number(new Decimal(factor).toDecimalPlaces(4)), workedMinutes: minutes || 0, scheduledMinutes: off ? 0 : scheduled || 0, earnings: money(dayGross), loss: money(dayLoss) });
  }
  if (!segments.size) addIssue('No effective contract found for this period.');
  const covered = ledger.filter(day => day.contractId);
  if (covered.length && ledger.some(day => !day.contractId && day.date > covered[0].date && day.date < covered.at(-1).date)) addIssue('There is a contract gap inside the covered period.');
  addWarning('Tax and other deductions use contract amounts and the selected percentage basis; no statutory tax engine is applied.');
  addWarning('Overtime, commission, advances, loans and penalties are not inferred. Add only verified amounts as reasoned adjustments.');
  const earningLines = [...earnings.values()].map(l => ({ ...l, amount: money(l.amount) }));
  const deductionLines = [...deductions.values()].map(l => ({ ...l, amount: money(l.amount) }));
  if (loss.gt(0)) deductionLines.push({ name: 'Attendance / unpaid-time deduction', basis: policy.shortHours === 'hours' ? 'Daily contract earnings × unpaid scheduled-time fraction' : 'Daily contract earnings × unpaid day fraction', amount: money(loss) });
  for (const a of adjustments) (a.type === 'earning' ? earningLines : deductionLines).push({ name: a.name.trim(), basis: a.reason.trim(), amount: money(a.amount), adjustment: true });
  const sum = lines => lines.reduce((n, line) => n.plus(line.amount), new Decimal(0));
  const totalEarnings = sum(earningLines), totalDeductions = sum(deductionLines), net = totalEarnings.minus(totalDeductions);
  if (net.lt(0)) addIssue('Deductions exceed earnings; resolve the negative net amount.');
  const counts = ledger.reduce((out, day) => { out[day.status] = (out[day.status] || 0) + 1; return out; }, {});
  return { version: VERSION, month, employee: { id: staff.id, name: `${staff.first_name} ${staff.last_name}`.trim(), code: staff.employee_code || String(staff.id), outletId: staff.assigned_outlet_id }, policy, adjustments, segments: [...segments.values()], ledger, earnings: earningLines, deductions: deductionLines, totals: { earnings: money(totalEarnings), deductions: money(totalDeductions), net: money(net) }, summary: { calendarDays: dates.length, coveredDays: ledger.filter(d => d.contractId).length, counts, payableUnits: Number(payableUnits.toDecimalPlaces(4)), workedHours: Number(new Decimal(totalWorked).div(60).toDecimalPlaces(2)), scheduledHours: Number(new Decimal(ledger.reduce((n, d) => n + d.scheduledMinutes, 0)).div(60).toDecimalPlaces(2)) }, issues, warnings };
}
module.exports = { calculateSalary, validatePolicy, datesInMonth, workedMinutes, VERSION };
