const test = require('node:test');
const assert = require('node:assert/strict');
const { validateApprovedCancellation } = require('../src/services/leaveCancellation');
const base = { dates: ['2027-01-04'], today: '2027-01-01', allocation: { isPaid: true }, duration: 'full', records: [{ date: '2027-01-04', status: 'paid_leave', breaks: [] }] };
test('allows cancellation when future attendance still matches', () => assert.doesNotThrow(() => validateApprovedCancellation(base)));
test('blocks cancellation of past leave', () => assert.throws(() => validateApprovedCancellation({ ...base, today: '2027-01-05' }), /Past approved leave/));
test('blocks changed or missing attendance', () => { assert.throws(() => validateApprovedCancellation({ ...base, records: [] }), /Attendance changed/); assert.throws(() => validateApprovedCancellation({ ...base, records: [{ ...base.records[0], check_in: { timestamp: 'x' } }] }), /Attendance changed/); });
test('blocks invalid or duplicate request dates', () => assert.throws(() => validateApprovedCancellation({ ...base, dates: ['2027-01-04', '2027-01-04'] }), /dates cannot be verified/));
