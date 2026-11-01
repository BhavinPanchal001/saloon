import test from 'node:test';
import assert from 'node:assert/strict';
import { getTalentIds, getTalentNames } from '../talentAssignments.js';

const staff = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];

test('multiple selections survive saving and reopening a bill', () => {
  const ids = getTalentIds({ staffIds: [1, '2', '1'] }, staff);
  assert.deepEqual(ids, ['1', '2']);
  const saved = JSON.parse(JSON.stringify({ staffIds: ids, staffAssigned: getTalentNames(ids, staff).join(', ') }));
  assert.equal(saved.staffAssigned, 'Alice, Bob');
  assert.deepEqual(getTalentIds(saved, staff), ['1', '2']);
});

test('legacy names resolve after staff loads, including names with commas', () => {
  const legacy = { staffIds: getTalentIds({ staffAssigned: 'Alice' }) };
  assert.deepEqual(getTalentIds(legacy, staff), ['1']);
  assert.deepEqual(getTalentIds({ staffAssigned: 'Doe, Jane' }, [{ id: 3, name: 'Doe, Jane' }]), ['3']);
});

test('clearing selections does not restore the previous assignment', () => {
  assert.deepEqual(getTalentIds({ staffIds: [], staffAssigned: 'Alice' }, staff), []);
});

test('package service assignments remain independent', () => {
  const services = [{ staffIds: ['1', '2'] }, { staffIds: ['2'] }];
  assert.deepEqual(services.map((svc) => getTalentNames(getTalentIds(svc, staff), staff)), [['Alice', 'Bob'], ['Bob']]);
});

test('unavailable legacy talents are preserved and empty bills remain unassigned', () => {
  assert.deepEqual(getTalentIds({ staffAssigned: 'Former employee' }, staff), ['Former employee']);
  assert.deepEqual(getTalentIds({}, staff), []);
});
