const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Request } = require('../src/config/sqlServerDialect');

function readColumn(type, value) {
  const request = new Request('SELECT calendar_value', () => {});
  let result;
  request.on('row', columns => { result = columns[0].value; });
  request.emit('row', [{ metadata: { type: { id: type } }, value }]);
  return result;
}

test('SQL DATE remains a calendar date at month, year and leap-day boundaries', () => {
  for (const date of ['2026-01-01', '2026-10-31', '2026-12-31', '2024-02-29']) {
    assert.equal(readColumn('date', new Date(`${date}T00:00:00.000Z`)), date);
  }
});

test('SQL TIME has no artificial 1970 date and retains fractional seconds', () => {
  assert.equal(readColumn('time', new Date('1970-01-01T09:30:00.000Z')), '09:30:00');
  assert.equal(readColumn('time', new Date('1970-01-01T23:59:59.123Z')), '23:59:59.123');
});

test('actual datetime values, NULL and already formatted values are preserved', () => {
  const timestamp = new Date('2026-10-31T18:30:00.123Z');
  for (const type of ['datetime', 'datetime2', 'datetimeoffset', 'smalldatetime']) {
    assert.equal(readColumn(type, timestamp), timestamp);
  }
  assert.equal(readColumn('date', null), null);
  assert.equal(readColumn('date', '2026-10-31'), '2026-10-31');
});
