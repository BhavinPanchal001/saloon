const assert = require('node:assert/strict');
const { sequelize, Role, Staff, Service, Outlet } = require('../src/models');

(async () => {
  let transaction;
  let server;
  try {
    await sequelize.authenticate();
    const [dates] = await sequelize.query("SELECT CAST('2026-10-31' AS date) AS calendar_date, CAST('09:30:00' AS time) AS clock_time, CAST('2026-10-31T12:34:56' AS datetime2) AS event_time", {
      type: require('sequelize').QueryTypes.SELECT,
    });
    assert.equal(dates.calendar_date, '2026-10-31');
    assert.equal(dates.clock_time, '09:30:00');
    assert.equal(dates.event_time.toISOString(), '2026-10-31T12:34:56.000Z');
    transaction = await sequelize.transaction();
    const role = await Role.create({ name: 'SQL Server verification', permissions: ['pos:view'] }, { transaction });
    await role.reload({ transaction });
    assert.deepEqual(role.permissions, ['pos:view']);
    await role.update({ permissions: ['inventory:view', 'pos:view'] }, { transaction });
    await role.reload({ transaction });
    assert.deepEqual(role.permissions, ['inventory:view', 'pos:view']);
    const defaultRole = await Role.create({ name: 'JSON default verification' }, { transaction });
    await defaultRole.reload({ transaction });
    assert(Array.isArray(defaultRole.permissions));
    const service = await Service.create({ service_name: 'SQL Server verification', assigned_outlet_ids: [1, 2] }, { transaction });
    await service.reload({ transaction });
    assert.deepEqual(service.assigned_outlet_ids, [1, 2]);
    assert.deepEqual(service.product_linkages, []);
    // Exercise nullable unique indexes without leaving test employees behind.
    const outlet = await Outlet.create({ name: 'SQL Server verification', code: `CHECK-${Date.now()}`, city: 'Test' }, { transaction });
    for (let index = 0; index < 2; index++) {
      await Staff.create({
        first_name: 'Verification', last_name: String(index), phone: '0000000000',
        personal_email: `check-${index}@invalid.local`, joining_date: '2026-10-31',
        assigned_outlet_id: outlet.id, user_id: null, employee_code: null,
      }, { transaction });
    }
    await transaction.rollback();
    transaction = null;
    const app = require('../src/app');
    server = await new Promise(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sqlserver-check@invalid.local', password: 'invalid' }),
    });
    assert.equal(login.status, 401);
    console.log('PASS: SQL Server JSON defaults, create/read/update, nullable unique indexes, transactions, health, and login database lookup. Test records rolled back.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (transaction) await transaction.rollback();
    if (server) await new Promise(resolve => server.close(resolve));
    await sequelize.close();
  }
})();
