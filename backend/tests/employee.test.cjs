const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const modelsPath = require.resolve('../src/models');
let state;
let failStaffSave;
const role = { id: 2, name: 'Stylist', is_active: true, permissions: ['pos:view'] };
const instance = data => ({ ...data, async update(fields) { Object.assign(this, fields); return this; } });
const models = {
  Role: { findByPk: async id => Number(id) === 2 ? role : null },
  Outlet: { findByPk: async id => Number(id) === 1 ? { id: 1, code: 'SAL', employee_code_prefix: 'SAL' } : null },
  Admin: {
    update: async (fields, { where }) => { const user = state.users.find(u => u.id === where.id); if (user) Object.assign(user, fields); },
    findByPk: async id => state.users.find(u => u.id === id),
    findOne: async ({ where }) => state.users.find(u => u.email === where.email),
    create: async data => { const user = instance({ ...data, id: 10 }); state.users.push(user); return user; },
  },
  Staff: {
    findByPk: async id => state.staff.find(s => s.id === Number(id)),
    findAll: async () => state.staff,
    findOne: async ({ where }) => {
      if (where.user_id) return state.staff.find(s => s.user_id === where.user_id);
      return state.staff.find(s => (!where.id || s.id !== where.id[Reflect.ownKeys(where.id)[0]]) && (
        where.phone ? where.phone[Reflect.ownKeys(where.phone)[0]]?.includes(s.phone) :
        where.personal_email ? s.personal_email === where.personal_email : s.email === where.email));
    },
    create: async data => {
      if (failStaffSave) throw new Error('Simulated staff insert failure');
      const staff = instance({ ...data, id: 1, role, contracts: [] });
      staff.destroy = async () => { state.staff = state.staff.filter(s => s.id !== staff.id); };
      state.staff.push(staff); return staff;
    },
  },
  sequelize: {
    transaction: async callback => {
      const snapshot = { users: state.users.map(u => instance(u)), staff: state.staff.map(s => instance(s)) };
      try { return await callback({ LOCK: { UPDATE: 'UPDATE' } }); }
      catch (err) { state = snapshot; throw err; }
    },
  },
};
require.cache[modelsPath] = { id: modelsPath, filename: modelsPath, loaded: true, exports: models };
const emailPath = require.resolve('../src/services/emailService');
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: {} };
const controller = require('../src/controllers/staffController');
const auth = require('../src/controllers/authController');
const valid = () => ({ firstName: ' Asha ', lastName: "D’Souza", personalEmail: ' ASHA@example.com ', phone: '+91 98765 43210', joiningDate: '2026-10-01', role: 'cashier', roleId: '2', assignedOutletId: '1', password: 'StrongPass9', accountEnabled: true, address: { country: 'IN', pincode: '400001' }, bankDetails: { accountHolderName: 'Asha Dsouza', bankName: 'State Bank', accountNumber: '12345678901', confirmAccountNumber: '12345678901', ifscCode: 'sbin0001234', accountType: 'Savings' } });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } });
beforeEach(() => { state = { users: [], staff: [] }; failStaffSave = false; role.is_active = true; process.env.JWT_SECRET = 'test-only-signing-secret'; });

test('shared validation accepts optional marital status, Unicode names and normalized inputs', async () => {
  const { validateEmployee, normalizeEmployee } = await import('../../shared/employeeValidation.js');
  assert.deepEqual(validateEmployee(valid()), {});
  assert.deepEqual(validateEmployee({ ...valid(), firstName: 'निशि', maritalStatus: '' }), {});
  const data = normalizeEmployee(valid());
  assert.equal(data.phone, '+919876543210');
  assert.equal(data.personalEmail, 'asha@example.com');
  assert.equal(data.bankDetails.ifscCode, 'SBIN0001234');
});

test('shared validation rejects invalid profile, employment, bank and password fields', async () => {
  const { validateEmployee } = await import('../../shared/employeeValidation.js');
  for (const [field, value] of [['firstName', '   '], ['lastName', 'Name123'], ['personalEmail', 'bad@'], ['phone', '1234567890'], ['dob', '2025-02-30'], ['joiningDate', '2026-02-30'], ['role', 'stylist'], ['password', 'weak'], ['password', 'Aa1' + 'é'.repeat(40)]]) {
    assert.ok(validateEmployee({ ...valid(), [field]: value })[field], field);
  }
  const errors = validateEmployee({ ...valid(), address: { country: 'IN', pincode: '123' }, bankDetails: { ...valid().bankDetails, accountNumber: 'abc', confirmAccountNumber: 'different', ifscCode: 'BAD' } });
  for (const key of ['address.pincode', 'bankDetails.accountNumber', 'bankDetails.confirmAccountNumber', 'bankDetails.ifscCode']) assert.ok(errors[key], key);
  assert.equal(validateEmployee({ ...valid(), password: '' }, { isEditing: true }).password, undefined);
});

test('creates employee and hashed user account together using the static app role', async () => {
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), employeeCode: 'FORGED' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(state.users.length, 1);
  assert.equal(state.staff[0].user_id, state.users[0].id);
  assert.equal(state.users[0].role, 'cashier');
  assert.equal(state.users[0].email, 'asha@example.com');
  assert.equal(state.staff[0].employee_code, 'SAL-101');
  assert.equal(state.staff[0].marital_status, null);
  assert.ok(await bcrypt.compare('StrongPass9', state.users[0].password));
  assert.equal(res.body.password, undefined);
});

test('rejects duplicate user emails and unknown roles without creating an employee', async () => {
  state.users.push(instance({ id: 20, email: 'asha@example.com' }));
  const res = response(); await controller.createOrUpdate({ body: valid() }, res);
  assert.equal(res.statusCode, 409); assert.ok(res.body.errors.email); assert.equal(state.staff.length, 0);
  state.users = []; role.is_active = false;
  const inactive = response(); await controller.createOrUpdate({ body: { ...valid(), role: 'unknown' } }, inactive);
  assert.equal(inactive.statusCode, 400); assert.ok(inactive.body.errors.role); assert.equal(state.users.length, 0);
});

test('rolls back user creation if saving the employee fails', async () => {
  failStaffSave = true;
  const res = response();
  const original = console.error; console.error = () => {};
  try { await controller.createOrUpdate({ body: valid() }, res); } finally { console.error = original; }
  assert.equal(res.statusCode, 500); assert.equal(state.users.length, 0); assert.equal(state.staff.length, 0);
});

test('editing preserves the password and updates account details and marital status', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  const hash = state.users[0].password;
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), id: 1, email: 'new@example.com', password: '', accountEnabled: false, maritalStatus: 'Married' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(state.users[0].password, hash);
  assert.equal(state.users[0].email, 'new@example.com');
  assert.equal(state.users[0].is_active, false);
  assert.equal(state.staff[0].marital_status, 'Married');
  assert.equal(state.users.length, 1);
});

test('employee login uses static role permissions and disabled accounts cannot log in', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  const res = response(); await auth.login({ body: { email: 'asha@example.com', password: 'StrongPass9' } }, res);
  assert.equal(res.statusCode, 200);
  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(payload.userType, 'staff'); assert.deepEqual(payload.permissions, ['pos:view', 'pos:create']);
  state.users[0].is_active = false;
  const disabled = response(); await auth.login({ body: { email: 'asha@example.com', password: 'StrongPass9' } }, disabled);
  assert.equal(disabled.statusCode, 401);
});

test('duplicate employee mobile numbers are rejected, including normalized +91 input', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), personalEmail: 'another@example.com' } }, res);
  assert.equal(res.statusCode, 409); assert.ok(res.body.errors.phone);
  assert.equal(state.users.length, 1); assert.equal(state.staff.length, 1);
});

test('deleting an employee disables the linked login', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  const res = response(); await controller.remove({ params: { id: '1' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(state.staff.length, 0); assert.equal(state.users[0].is_active, false);
});

test('OTP verification retains the employee role permissions', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  Object.assign(state.users[0], { otp_code: '123456', otp_expires_at: new Date(Date.now() + 60000) });
  const res = response();
  await auth.verifyOTP({ body: { email: 'asha@example.com', otp: '123456' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(jwt.verify(res.body.token, process.env.JWT_SECRET).permissions, ['pos:view', 'pos:create']);
  state.staff[0].access_role = 'unknown';
  const inactive = response();
  await auth.login({ body: { email: 'asha@example.com', password: 'StrongPass9' } }, inactive);
  assert.equal(inactive.statusCode, 403);
});

test('schema migration is safe to run again when columns already exist', async () => {
  const migration = require('../src/migrations/20261029000000-link-staff-users');
  let writes = 0;
  await migration.up({
    showAllTables: async () => ['admins', 'roles', 'staff_members'],
    describeTable: async table => table === 'admins' ? { role: { type: 'VARCHAR(50)' } } : table === 'roles' ? { permissions: {} } : { user_id: {} },
    addColumn: async () => { writes++; },
    changeColumn: async () => { writes++; },
  }, require('sequelize').DataTypes);
  assert.equal(writes, 0);
});

test('phone rules depend on the selected dial code, independently of the address', async () => {
  const { validateEmployee, normalizeEmployee } = await import('../../shared/employeeValidation.js');
  for (const [code, phone, stored] of [['+91', '9876543210', '+919876543210'], ['+1', '4155552671', '+14155552671'], ['+44', '7911123456', '+447911123456']]) {
    const input = { ...valid(), phoneCountryCode: code, phone };
    assert.equal(validateEmployee(input).phone, undefined, code);
    const normalized = normalizeEmployee(input);
    assert.equal(normalized.phone, stored);
    assert.equal(normalizeEmployee(normalized).phone, stored, 'normalizing twice must not double the dial code');
    assert.equal(validateEmployee(normalized).phone, undefined);
  }
});

test('phone validation rejects letters, missing or unsupported codes and incorrect lengths', async () => {
  const { validateEmployeePhone, digitsOnly, splitEmployeePhone } = await import('../../shared/employeePhone.js');
  for (const [phone, code] of [['98765abc10', '+91'], ['1234567890', '+91'], ['987654321', '+91'], ['98765432101', '+91'], ['1155552671', '+1'], ['4151552671', '+1'], ['07911123456', '+44'], ['791112345', '+44'], ['+447911123456', '+91']]) {
    assert.ok(validateEmployeePhone(phone, code).phone, phone + ' ' + code);
  }
  assert.ok(validateEmployeePhone('9876543210', '').phoneCountryCode);
  assert.ok(validateEmployeePhone('9876543210', '+999').phoneCountryCode);
  assert.equal(digitsOnly('abc98-76xyz'), '9876');
  assert.deepEqual(splitEmployeePhone('+44 7911 123456'), { phoneCountryCode: '+44', phoneCountry: 'GG', phone: '7911123456' });
  assert.deepEqual(splitEmployeePhone('9876543210'), { phoneCountryCode: '+91', phoneCountry: 'IN', phone: '9876543210' });
});

test('existing local Indian numbers remain protected against duplicates after saving with a dial code', async () => {
  state.staff.push(instance({ id: 9, phone: '9876543210', personal_email: 'older@example.com' }));
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), phoneCountryCode: '+91', phone: '9876543210' } }, res);
  assert.equal(res.statusCode, 409); assert.ok(res.body.errors.phone);
});

test('static app roles match the original App User options and employee creation needs no role master lookup', async () => {
  const { APP_ROLES } = await import('../../shared/appRoles.js');
  assert.deepEqual(APP_ROLES.map(role => role.value), ['manager', 'cashier', 'admin', 'super_admin']);
  assert.deepEqual(APP_ROLES.map(role => role.label), ['Outlet Manager', 'Cashier / POS Operator', 'Admin', 'Super Admin']);
  const originalLookup = models.Role.findByPk;
  models.Role.findByPk = async () => { throw new Error('Role master must not be queried for a static role'); };
  try {
    const res = response();
    await controller.createOrUpdate({ body: { ...valid(), role: 'manager', roleId: '' } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(state.users[0].role, 'manager');
    assert.equal(state.staff[0].access_role, 'manager');
    assert.equal(state.staff[0].role_id, null);
    assert.equal(res.body.role, 'manager');
  } finally { models.Role.findByPk = originalLookup; }
});

test('worldwide country list has unique country entries and validates mobile examples for every region', async () => {
  const { phoneCountryOptions, validateEmployeePhone } = await import('../../shared/employeePhone.js');
  const { getExampleNumber } = require('libphonenumber-js/max');
  const examples = require('libphonenumber-js/examples.mobile.json');
  assert.ok(phoneCountryOptions.length >= 240);
  assert.equal(new Set(phoneCountryOptions.map(country => country.country)).size, phoneCountryOptions.length);
  let verified = 0;
  for (const country of phoneCountryOptions) {
    assert.match(country.code, /^\+\d+$/);
    const number = getExampleNumber(country.country, examples);
    if (number?.isValid()) {
      assert.deepEqual(validateEmployeePhone(number.nationalNumber, country.code, country.country), {}, country.name);
      verified++;
    }
  }
  assert.ok(verified >= 240);
  const us = phoneCountryOptions.find(country => country.country === 'US');
  const ca = phoneCountryOptions.find(country => country.country === 'CA');
  assert.equal(us.code, ca.code);
  assert.notEqual(us.name, ca.name);
});

test('updating an employee without an admin account creates and links exactly one user', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  state.staff[0].user_id = null;
  state.users = [];
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), id: 1 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(state.users.length, 1);
  assert.equal(state.staff[0].user_id, state.users[0].id);
  assert.ok(await bcrypt.compare(valid().password, state.users[0].password));
  await controller.createOrUpdate({ body: { ...valid(), id: 1, password: '' } }, response());
  assert.equal(state.users.length, 1, 'repeated updates must not create another account');
});

test('updating an unlinked employee reuses an existing email account and preserves its password', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  state.staff[0].user_id = null;
  const hash = state.users[0].password;
  const userId = state.users[0].id;
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), id: 1, password: '' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(state.users.length, 1);
  assert.equal(state.staff[0].user_id, userId);
  assert.equal(state.users[0].password, hash);
});

test('a missing account requires an initial password and returns an actionable field error', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  state.staff[0].user_id = null;
  state.users = [];
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), id: 1, password: '' } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.errors.password, /System Access/);
  assert.equal(state.users.length, 0);
  assert.equal(state.staff[0].user_id, null);
});

test('an existing account already linked to another employee cannot be reused', async () => {
  await controller.createOrUpdate({ body: valid() }, response());
  state.staff[0].user_id = null;
  state.staff.push(instance({ id: 2, user_id: state.users[0].id, phone: '+919999999999', personal_email: 'other@example.com', email: 'other@example.com' }));
  const res = response();
  await controller.createOrUpdate({ body: { ...valid(), id: 1, password: '' } }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.errors.email, /another employee/);
  assert.equal(state.staff[0].user_id, null);
  assert.equal(state.users.length, 1);
});
