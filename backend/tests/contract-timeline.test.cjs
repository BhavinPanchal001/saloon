const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planContractChange, contractForDate } = require('../src/services/contractTimeline');
const { termsFor } = require('../src/services/contractTerms');
const contract = (id, start, end) => ({ id, code: 'CON-' + id, employee_id: 1, status: 'active', start_date: start, end_date: end, current_version: id, terms_snapshot: { shift: { name: 'Shift ' + id }, workWeek: { operational_days: ['Monday'] } } });

test('next-month revision closes predecessor at month end, retaining current-month terms', () => {
  const old = contract(1, '2026-05-01', '2027-04-30', 31000);
  const next = contract(2, '2026-11-01', '2027-04-30', 62000);
  const plan = planContractChange({ candidate: next, previous: old, others: [old] });
  assert.equal(plan.predecessorEnd, '2026-10-31');
  old.end_date = plan.predecessorEnd;
  assert.equal(contractForDate([old, next], '2026-10-31').id, 1);
  assert.equal(contractForDate([old, next], '2026-11-01').id, 2);
});





test('overlaps and revisions starting on or before predecessor start are rejected', () => {
  const old = contract(1, '2026-10-01', '2026-12-31', 31000);
  const next = contract(2, '2026-11-01', '2026-12-31', 62000);
  assert.throws(() => planContractChange({ candidate: next, others: [old] }), /overlap/);
  assert.throws(() => contractForDate([old, next], '2026-11-01'), /Overlapping/);
  assert.throws(() => planContractChange({ candidate: { ...next, start_date: '2026-10-01' }, previous: old, others: [old] }), /start after/);
});

test('active history cannot be edited and group boundaries cannot be exceeded', () => {
  const old = contract(1, '2026-05-01', '2026-10-31', 30000);
  assert.throws(() => planContractChange({ candidate: old, previous: old, others: [old], isEditing: true, today: '2026-10-29' }), /Create Revision/);
  assert.throws(() => planContractChange({ candidate: contract(2, '2026-11-01', '2026-11-30', 40000), others: [], group: { start_date: '2026-05-01', end_date: '2026-10-31' } }), /inside the selected group/);
});









test('the form identifies an existing October contract as a revision choice', async () => {
  const { findContractConflicts, revisionCandidates, previousContractEnd } = await import('../../shared/contractOverlap.js');
  const existing = [{ id: 7, employeeId: 1, code: 'CON-NFMXZ', status: 'active', startDate: '2026-05-01', endDate: '2026-10-31' }];
  const candidate = { employeeId: '1', startDate: '2026-10-01', endDate: '2026-10-31', status: 'active' };
  const conflicts = findContractConflicts(existing, candidate);
  assert.equal(conflicts.length, 1);
  assert.equal(revisionCandidates(conflicts, candidate.startDate)[0].id, 7);
  assert.equal(previousContractEnd(candidate.startDate), '2026-09-30');
  assert.equal(findContractConflicts(existing, { ...candidate, employeeId: 2 }).length, 0);
  assert.equal(findContractConflicts(existing, { ...candidate, id: 7 }).length, 0);
  assert.equal(findContractConflicts(existing, { ...candidate, startDate: '2026-11-01' }).length, 0);
  assert.equal(findContractConflicts(existing, { ...candidate, status: 'draft' }).length, 0);
});

test('same-start-date replacements cannot discard history and later overlaps stay visible', async () => {
  const { findContractConflicts, revisionCandidates } = await import('../../shared/contractOverlap.js');
  const rows = [{ id: 1, employeeId: 1, status: 'active', startDate: '2026-05-01', endDate: '2026-10-31' }, { id: 2, employeeId: 1, status: 'active', startDate: '2026-11-01', endDate: '2026-12-31' }];
  assert.equal(revisionCandidates(rows, '2026-05-01').length, 0);
  const conflicts = findContractConflicts(rows, { employeeId: 1, startDate: '2026-10-01', endDate: '2026-12-31' });
  assert.equal(conflicts.length, 2);
  assert.equal(revisionCandidates(conflicts, '2026-10-01').length, 1);
});
