// Uses narrowly scoped, temporary QA records in the configured development DB.
// All fixture records and saved calculations are removed in finally.
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { sequelize, Staff, Contract, Attendance, SalaryCalculation, SalarySetting, Admin } = require('../src/models');
const { createSalarySettingsStore } = require('../src/services/salarySettings');
const { datesInMonth } = require('../src/services/salaryCalculation');
let fixture, contract, server, settingsId, ownsSettings = false;
const policy = { divisor: 'calendar', shortHours: 'status', deductionBase: 'basic', prorateFixedDeductions: true };
async function main() {
  const reference = await Staff.findByPk(1);
  const existingContract = await Contract.findOne({ where: { employee_id: 1 } });
  const admin = await Admin.findOne({ attributes: ['id'] });
  assert.ok(reference && existingContract && admin, 'Test requires a reference employee/contract/outlet and login account.');
  const suffix = Date.now().toString();
  fixture = await Staff.create({ first_name: '[QA payroll]', last_name: suffix, phone: '9000000000', personal_email: `qa-payroll-${suffix}@example.invalid`, joining_date: '2025-02-01', assigned_outlet_id: reference.assigned_outlet_id, status: 'inactive' });
  contract = await Contract.create({ employee_id: fixture.id, code: `QA-PAYROLL-${suffix}`, title: 'Temporary integration fixture', type_id: existingContract.type_id, start_date: '2025-02-01', end_date: '2025-02-28', status: 'active', holiday_configuration: [], leave_configuration: [], terms_snapshot: { shift: { start_time: '09:00', end_time: '18:00', break_duration: 60 }, workWeek: { operational_days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] }, salaryComponents: [{ id: 1, name: 'Basic salary', code: 'BASIC', type: 'earning', calculationType: 'fixed', amount: 2800 }] } });
  for (const date of datesInMonth('2025-02')) await Attendance.create({ staff_id: fixture.id, date, status: 'present', check_in: { timestamp: `${date}T09:00:00+05:30` }, check_out: { timestamp: `${date}T18:00:00+05:30` }, breaks: [{ in: `${date}T13:00:00+05:30`, out: `${date}T14:00:00+05:30` }] });
  settingsId = 1000000000 + fixture.id;
  assert.equal(await SalarySetting.count({ where: { id: settingsId } }), 0, 'QA settings key must be unused.');
  const app = express(); app.use(express.json()); app.use('/payroll', require('../src/routes/payroll').createPayrollRouter(createSalarySettingsStore(settingsId))); app.use('/attendance', require('../src/routes/attendance'));
  server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = `http://127.0.0.1:${server.address().port}/payroll`;
  const token = jwt.sign({ id: admin.id, role: 'admin', userType: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  async function request(path, body, authorization = token, method) {
    const result = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: result.status, data: await result.json() };
  }
  assert.equal((await request('?month=2025-02', null, null)).status, 401);
  const staffToken = jwt.sign({ id: admin.id, role: 'manager', userType: 'staff' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  assert.equal((await request('?month=2025-02', null, staffToken)).status, 403);
  assert.equal((await request('/settings')).data.configured, false);
  assert.equal((await request(`/${fixture.id}/preview`, { month: '2025-02', policy })).status, 400);
  assert.equal((await request('/settings', { policy, revision: 0 }, staffToken, 'PUT')).status, 403);
  assert.equal((await request('/settings', { policy: { ...policy, divisor: 'invalid' }, revision: 0 }, token, 'PUT')).status, 400);
  const configured = await request('/settings', { policy, revision: 0 }, token, 'PUT');
  ownsSettings = configured.status === 200;
  assert.equal(configured.status, 200); assert.equal(configured.data.revision, 1);
  assert.deepEqual((await request('/settings')).data.policy, policy);
  let preview = await request(`/${fixture.id}/preview`, { month: '2025-02', policy: { ...policy, divisor: 'working', shortHours: 'hours' } });
  assert.equal(preview.status, 200); assert.equal(preview.data.calculation.totals.net, '2800.00'); assert.equal(preview.data.calculation.issues.length, 0);
  assert.deepEqual(preview.data.calculation.policy, policy, 'Client policy cannot override shared settings.');
  await request('/settings', { policy, revision: 1 }, token, 'PUT');
  assert.equal((await request('/settings', { policy, revision: 1 }, token, 'PUT')).status, 409);
  assert.equal((await request(`/${fixture.id}/save`, { month: '2025-02', adjustments: [], sourceHash: preview.data.sourceHash, revision: 0 })).status, 409, 'A changed setting invalidates an existing preview.');
  preview = await request(`/${fixture.id}/preview`, { month: '2025-02' });
  const payload = { month: '2025-02', policy, adjustments: [], sourceHash: preview.data.sourceHash, revision: 0 };
  const draft = await request(`/${fixture.id}/save`, payload);
  assert.equal(draft.status, 200); assert.equal(draft.data.status, 'draft'); assert.equal(draft.data.revision, 1);
  assert.equal((await request(`/${fixture.id}/save`, payload)).status, 409);
  const concurrent = await Promise.all([request(`/${fixture.id}/save`, { ...payload, revision: 1 }), request(`/${fixture.id}/save`, { ...payload, revision: 1 })]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  const record = await Attendance.findOne({ where: { staff_id: fixture.id, date: '2025-02-01' } });
  await record.update({ status: 'half_day' });
  assert.equal((await request(`/${fixture.id}/save`, { ...payload, revision: 2 })).status, 409);
  const newPreview = await request(`/${fixture.id}/preview`, { month: '2025-02', policy });
  assert.equal(newPreview.data.calculation.totals.net, '2750.00');
  const finalized = await request(`/${fixture.id}/save`, { ...payload, sourceHash: newPreview.data.sourceHash, revision: 2, finalize: true });
  assert.equal(finalized.status, 200); assert.equal(finalized.data.status, 'finalized');
  assert.equal((await request(`/${fixture.id}/save`, { ...payload, revision: 3 })).status, 409);
  const fetched = await request(`/${fixture.id}?month=2025-02`);
  assert.equal(fetched.data.calculation.totals.net, '2750.00'); assert.ok(fetched.data.calculation.sources.attendance.length === 28);
  assert.equal(fetched.data.calculation.salarySettings.revision, 2);
  await request('/settings', { policy: { ...policy, shortHours: 'hours' }, revision: 2 }, token, 'PUT');
  assert.deepEqual((await request(`/${fixture.id}?month=2025-02`)).data.calculation.policy, policy, 'Finalized payroll keeps its historical policy.');
  const lockedAttendance = await fetch(`http://127.0.0.1:${server.address().port}/attendance/mark`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: fixture.id, date: '2025-02-01', status: 'present' }) });
  assert.equal(lockedAttendance.status, 409);
  const realPreview = await request('/1/preview', { month: '2026-10', policy });
  assert.equal(realPreview.status, 200);
  assert.ok(realPreview.data.calculation.segments.length >= 1);
  assert.deepEqual(realPreview.data.calculation.policy, { ...policy, shortHours: 'hours' });
  console.log(JSON.stringify({ passed: ['authentication', 'role restrictions', 'settings configuration required', 'settings persistence and validation', 'shared policy cannot be overridden', 'settings revision conflict', 'setting changes invalidate previews', 'preview', 'draft persistence', 'simultaneous save protection', 'source change detection', 'finalization', 'historical policy preserved', 'finalized attendance lock', 'October shared-settings preview'] }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (fixture) { await SalaryCalculation.destroy({ where: { staff_id: fixture.id } }); await Attendance.destroy({ where: { staff_id: fixture.id } }); if (contract) await contract.destroy(); await fixture.destroy(); }
  if (ownsSettings) await SalarySetting.destroy({ where: { id: settingsId } });
  await sequelize.close();
});
