const { validDate, fail } = require('./leaveValidation');

function validateApprovedCancellation({ dates, today, allocation, duration, records }) {
  if (!Array.isArray(dates) || !dates.length || dates.some(date => !validDate(date)) || new Set(dates).size !== dates.length) fail('The request dates cannot be verified.');
  if (dates.some(date => date < today)) fail('Past approved leave cannot be cancelled automatically because attendance or payroll may already be finalized.');
  if (!allocation) fail('The contract leave allocation is unavailable. Attendance must be reconciled manually.');
  const expected = duration === 'half' ? 'half_day' : allocation.isPaid ? 'paid_leave' : 'absent';
  if (records.length !== dates.length || records.some(record => !dates.includes(record.date) || record.status !== expected || record.check_in || record.check_out || (record.breaks || []).length)) fail('Attendance changed after approval. Reconcile it before cancelling this leave.');
}

module.exports = { validateApprovedCancellation };
