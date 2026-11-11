const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildContractPolicies } = require('../src/services/contractPolicies');
const { toContractResponse } = require('../src/services/contractResponse');

const leaves = [{ id: 1, name: 'Annual Leave', days_allowed: 12, is_paid: true }, { id: 2, name: 'Unpaid Leave', days_allowed: 5, is_paid: false }];
const holidays = [{ id: 4, occasion_name: 'New Year', start_date: '2026-01-01', end_date: '2026-01-01', occasion_type: 'National' }];

test('selected policies and overridden leave counts round-trip into read-only contract details', () => {
  const saved = buildContractPolicies({ selectedLeaves: ['1', '2'], leaveCounts: { 1: 18, 2: 0 }, selectedHolidays: ['4'], probationPeriodMonths: 3, noticePeriodDays: 30 }, leaves, holidays);
  const result = toContractResponse({ ...saved, id: 7, overtime_enabled: true, shift_id: 3, shift: { name: 'Morning', start_time: '09:00', end_time: '18:00' }, work_week_id: 2, workWeek: { name: 'Five days', operational_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] } });
  assert.deepEqual(result.selectedLeaves, [1, 2]);
  assert.deepEqual(result.leaveCounts, { 1: 18, 2: 0 });
  assert.equal(result.leaveAllocations[1].isPaid, false);
  assert.equal(result.holidays[0].name, 'New Year');
  assert.equal(result.holidays[0].startDate, '2026-01-01');
  assert.equal(result.overtime.enabled, true);
  assert.equal(result.shiftName, 'Morning');
  assert.deepEqual(result.weeklyOffPattern, ['Saturday', 'Sunday']);
  assert.equal(result.probationPeriodMonths, 3);
  assert.equal(result.noticePeriodDays, 30);
});

test('old contracts have no invented leave, holiday, shift or weekly off settings', () => {
  const result = toContractResponse({ id: 1 });
  assert.equal(result.leaveConfigurationSaved, false);
  assert.equal(result.holidayConfigurationSaved, false);
  assert.deepEqual(result.leaveAllocations, []);
  assert.deepEqual(result.holidays, []);
  assert.deepEqual(result.weeklyOffPattern, []);
  assert.equal(result.shiftName, '');
});

test('an explicitly empty selection is distinct from an unsaved legacy configuration', () => {
  const saved = buildContractPolicies({ selectedLeaves: [], selectedHolidays: [] }, leaves, holidays);
  const result = toContractResponse(saved);
  assert.equal(result.leaveConfigurationSaved, true);
  assert.equal(result.holidayConfigurationSaved, true);
  assert.deepEqual(result.selectedLeaves, []);
  assert.deepEqual(result.selectedHolidays, []);
  assert.deepEqual(buildContractPolicies({}, leaves, holidays), {});
});

test('invalid policy IDs and invalid leave counts are rejected before saving', () => {
  for (const payload of [{ selectedLeaves: ['missing'] }, { selectedHolidays: ['missing'] }, { selectedLeaves: [1], leaveCounts: { 1: -1 } }, { selectedLeaves: [1], leaveCounts: { 1: 1.5 } }, { noticePeriodDays: -2 }]) {
    assert.throws(() => buildContractPolicies(payload, leaves, holidays), err => err.status === 400);
  }
});

test('policy snapshots preserve saved names and custom days when masters later change', () => {
  const masters = structuredClone(leaves);
  const saved = buildContractPolicies({ selectedLeaves: [1], leaveCounts: { 1: 15 } }, masters, []);
  masters[0].name = 'Renamed'; masters[0].days_allowed = 8;
  assert.equal(saved.leave_configuration[0].name, 'Annual Leave');
  assert.equal(saved.leave_configuration[0].count, 15);
});

test('MySQL JSON text is decoded before displaying leave and holiday selections', () => {
  const saved = buildContractPolicies({ selectedLeaves: [1], leaveCounts: { 1: 18 }, selectedHolidays: [4] }, leaves, holidays);
  const result = toContractResponse({ leave_configuration: JSON.stringify(saved.leave_configuration), holiday_configuration: JSON.stringify(saved.holiday_configuration) });
  assert.equal(result.leaveConfigurationSaved, true);
  assert.deepEqual(result.selectedLeaves, [1]);
  assert.equal(result.leaveCounts[1], 18);
  assert.equal(result.holidays[0].name, 'New Year');
  assert.deepEqual(toContractResponse({ leave_configuration: '[]' }).selectedLeaves, []);
  assert.equal(toContractResponse({ leave_configuration: '[]' }).leaveConfigurationSaved, true);
  assert.equal(toContractResponse({ leave_configuration: 'invalid' }).leaveConfigurationSaved, false);
});
