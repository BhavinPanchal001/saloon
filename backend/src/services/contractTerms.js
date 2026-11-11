const readObject = value => {
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return null; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
};
const snapshotTerms = contract => ({
  shift: contract.shift ? { id: contract.shift.id, name: contract.shift.name, start_time: contract.shift.start_time, end_time: contract.shift.end_time, break_duration: contract.shift.break_duration, grace_period: contract.shift.grace_period } : null,
  workWeek: contract.workWeek ? { id: contract.workWeek.id, name: contract.workWeek.name, operational_days: contract.workWeek.operational_days } : null,
});
const termsFor = contract => readObject(contract.terms_snapshot) || snapshotTerms(contract);
module.exports = { readObject, snapshotTerms, termsFor };
