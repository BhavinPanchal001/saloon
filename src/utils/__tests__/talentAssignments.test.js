import test from 'node:test';
import assert from 'node:assert/strict';
import { getTalentEffort, getTalentIds, getTalentNames, isTalentEffortValid, serializeTalentEffort, splitTalentEffort } from '../talentAssignments.js';

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

test('legacy assignments default to an even split with exact hundredths', () => {
  assert.deepEqual(getTalentEffort({ staffAssigned: 'Alice' }, staff), [{ staffId: '1', percentage: 100 }]);
  const effort = getTalentEffort({ staffIds: [1, 2, 3] }, staff);
  assert.deepEqual(effort.map(({ percentage }) => percentage), [33.34, 33.33, 33.33]);
  assert.equal(isTalentEffortValid(effort), true);
});

test('custom effort survives a JSON round trip independently for each package service', () => {
  const first = { staffEffort: [{ staffId: '1', percentage: '62.25' }, { staffId: '2', percentage: '37.75' }] };
  const second = { staffEffort: splitTalentEffort(['2']) };
  const saved = JSON.parse(JSON.stringify([first, second].map((service) => serializeTalentEffort(service, staff))));
  assert.deepEqual(saved.map((service) => service.staffIds), [['1', '2'], ['2']]);
  assert.deepEqual(saved.map((service) => getTalentEffort(service, staff).map(({ percentage }) => percentage)), [[62.25, 37.75], [100]]);
  assert.deepEqual(serializeTalentEffort({ ...saved[0], staffEffort: [] }, staff), { staffIds: [], staffAssigned: null, staffEffort: [] });
});

test('effort requires a full split and accepts unassigned items', () => {
  assert.equal(isTalentEffortValid([]), true);
  for (const percentage of ['', '-1', '101', '50.001', '99.99', 'invalid']) {
    assert.equal(isTalentEffortValid([{ staffId: '1', percentage }]), false);
  }
});
