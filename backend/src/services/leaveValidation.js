const { localToday, contractForDate } = require('./contractTimeline');
const { termsFor } = require('./contractTerms');

const fail = message => { const error = new Error(message); error.status = 400; throw error; };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function calculateLeave({ contracts, leaveType, startDate, endDate, duration, today = localToday(), checkNotice = true }) {
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) fail('Enter a valid date range.');
  if (!['full', 'half'].includes(duration)) fail('Select a valid duration.');
  const span = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
  if (span > 366) fail('A request cannot exceed 367 calendar days.');
  if (duration === 'half' && startDate !== endDate) fail('Half-day leave must be requested for one date.');
  const contract = contractForDate(contracts, startDate);
  if (!contract || contractForDate(contracts, endDate)?.id !== contract.id) fail('The request must be within one active contract.');
  const allocation = (contract.leave_configuration || []).find(item => Number(item.id) === Number(leaveType?.id));
  if (!allocation) fail('This leave type is not included in the contract.');
  if (checkNotice && Number(leaveType.advance_notice_days) > 0 && !leaveType.allow_anytime && (Date.parse(startDate) - Date.parse(today)) / 86400000 < Number(leaveType.advance_notice_days)) fail(`This leave type requires ${leaveType.advance_notice_days} days advance notice.`);
  const workDays = termsFor(contract).workWeek?.operational_days;
  const holidays = contract.holiday_configuration || [];
  const dates = [];
  for (let time = Date.parse(startDate); time <= Date.parse(endDate); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    if (contractForDate(contracts, date)?.id !== contract.id) fail('The request must be within one active contract.');
    const day = new Date(time).getUTCDay();
    const working = Array.isArray(workDays) && workDays.length ? workDays.includes(names[day]) : ![0, 6].includes(day);
    if (working && !holidays.some(h => h.startDate <= date && (h.endDate || h.startDate) >= date)) dates.push(date);
  }
  if (!dates.length) fail('The selected dates contain no scheduled working days.');
  return { contract, allocation, dates, days: dates.length * (duration === 'half' ? 0.5 : 1) };
}

module.exports = { calculateLeave, validDate, fail };
