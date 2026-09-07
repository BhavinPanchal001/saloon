const {
  sequelize,
  Customer,
  Service,
  Product,
  Bill,
  Staff,
  Package,
  Appointment,
  Outlet,
  LoyaltyTier,
  ServiceCategory,
  Role,
} = require('../src/models');
const { Op } = require('sequelize');

async function runAudit() {
  console.log('=== STARTING DEEP AUDIT OF SEARCH ENTITIES ===\n');

  const tests = [
    {
      name: '1. Customer Search Query',
      fn: () => Customer.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: '%a%' } },
            { phone: { [Op.like]: '%a%' } },
            { email: { [Op.like]: '%a%' } },
          ],
        },
        include: [{ model: LoyaltyTier, as: 'loyaltyTier', attributes: ['id', 'name', 'badge_color'] }],
        attributes: ['id', 'name', 'phone', 'email', 'gender', 'notes'],
        limit: 3,
      }),
    },
    {
      name: '2. Service Search Query',
      fn: () => Service.findAll({
        where: {
          service_name: { [Op.like]: '%a%' },
        },
        include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name'] }],
        attributes: ['id', 'service_name', 'price', 'duration', 'status'],
        limit: 3,
      }),
    },
    {
      name: '3. Product Search Query',
      fn: () => Product.findAll({
        where: {
          item_name: { [Op.like]: '%a%' },
        },
        attributes: ['id', 'item_name', 'unit_price', 'central_stock', 'status'],
        limit: 3,
      }),
    },
    {
      name: '4. Bill Search Query',
      fn: () => Bill.findAll({
        where: {
          [Op.or]: [
            { bill_number: { [Op.like]: '%a%' } },
            { customer_name: { [Op.like]: '%a%' } },
            { customer_phone: { [Op.like]: '%a%' } },
          ],
        },
        attributes: ['id', 'bill_number', 'customer_name', 'customer_phone', 'total', 'payment_method', 'createdAt', 'outlet_id'],
        limit: 3,
      }),
    },
    {
      name: '5. Staff Search Query',
      fn: () => Staff.findAll({
        where: {
          [Op.or]: [
            { first_name: { [Op.like]: '%a%' } },
            { last_name: { [Op.like]: '%a%' } },
            { phone: { [Op.like]: '%a%' } },
            { employee_code: { [Op.like]: '%a%' } },
            { email: { [Op.like]: '%a%' } },
            { personal_email: { [Op.like]: '%a%' } },
          ],
        },
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
        attributes: ['id', 'first_name', 'last_name', 'phone', 'employee_code', 'email', 'personal_email'],
        limit: 3,
      }),
    },
    {
      name: '6. Package Search Query',
      fn: () => Package.findAll({
        where: {
          [Op.or]: [
            { package_name: { [Op.like]: '%a%' } },
            { package_code: { [Op.like]: '%a%' } },
          ],
        },
        attributes: ['id', 'package_name', 'package_code', 'price', 'validity_days', 'status', 'category'],
        limit: 3,
      }),
    },
    {
      name: '7. Appointment Search Query',
      fn: () => Appointment.findAll({
        where: {
          [Op.or]: [
            { customer_name: { [Op.like]: '%a%' } },
            { customer_phone: { [Op.like]: '%a%' } },
          ],
        },
        attributes: ['id', 'customer_name', 'customer_phone', 'appointment_date', 'start_time', 'status', 'outlet_id'],
        limit: 3,
      }),
    },
    {
      name: '8. Outlet Search Query',
      fn: () => Outlet.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: '%a%' } },
            { city: { [Op.like]: '%a%' } },
            { code: { [Op.like]: '%a%' } },
          ],
        },
        attributes: ['id', 'name', 'code', 'city', 'phone'],
        limit: 3,
      }),
    },
  ];

  let failedCount = 0;
  for (const test of tests) {
    try {
      const rows = await test.fn();
      console.log(`[PASS] ${test.name}: successfully returned ${rows.length} records.`);
    } catch (err) {
      console.error(`[FAIL] ${test.name}:`);
      console.error(`       Error: ${err.message}`);
      if (err.parent && err.parent.sql) {
        console.error(`       SQL: ${err.parent.sql}`);
      }
      failedCount++;
    }
  }

  console.log('\n--- Specific query for "bhavin" ---');
  try {
    const customers = await Customer.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%bhavin%' } },
          { phone: { [Op.like]: '%bhavin%' } },
          { email: { [Op.like]: '%bhavin%' } },
        ],
      },
      include: [{ model: LoyaltyTier, as: 'loyaltyTier', attributes: ['id', 'name', 'badge_color'] }],
      attributes: ['id', 'name', 'phone', 'email', 'gender', 'notes'],
    });
    console.log(`Customer "bhavin" matches: ${customers.length}`);
    customers.forEach(c => {
      console.log(`  - Customer ID: ${c.id}, Name: ${c.name}, Phone: ${c.phone}, Loyalty: ${c.loyaltyTier ? c.loyaltyTier.name : 'None'}`);
    });
  } catch (err) {
    console.error(`Failed querying customer 'bhavin':`, err.message);
    failedCount++;
  }

  try {
    const appointments = await Appointment.findAll({
      where: {
        [Op.or]: [
          { customer_name: { [Op.like]: '%bhavin%' } },
          { customer_phone: { [Op.like]: '%bhavin%' } },
        ],
      },
      attributes: ['id', 'customer_name', 'customer_phone', 'appointment_date', 'start_time', 'status', 'outlet_id'],
    });
    console.log(`Appointment "bhavin" matches: ${appointments.length}`);
    appointments.forEach(a => {
      console.log(`  - Appt ID: ${a.id}, Customer: ${a.customer_name}, Date: ${a.appointment_date}, Time: ${a.start_time}, Outlet: ${a.outlet_id}`);
    });
  } catch (err) {
    console.error(`Failed querying appointment 'bhavin':`, err.message);
    failedCount++;
  }

  console.log(`\n=== AUDIT FINISHED: ${failedCount === 0 ? 'ALL PASSED (0 ERRORS)' : failedCount + ' TESTS FAILED'} ===`);
  process.exit(failedCount === 0 ? 0 : 1);
}

runAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
