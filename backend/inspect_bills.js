const { Bill, Outlet, Staff, Service, Package, MonthlyBudget } = require('./src/models');

async function inspect() {
  try {
    const outlets = await Outlet.findAll();
    console.log('--- OUTLETS ---');
    console.log(outlets.map((o) => ({ id: o.id, name: o.name, code: o.code })));

    const staff = await Staff.findAll();
    console.log('--- STAFF COUNT PER OUTLET ---');
    const staffByOutlet = {};
    staff.forEach((s) => {
      staffByOutlet[s.assigned_outlet_id] = (staffByOutlet[s.assigned_outlet_id] || 0) + 1;
    });
    console.log(staffByOutlet);

    const bills = await Bill.findAll();
    console.log('--- BILLS COUNT PER OUTLET ---');
    const billsByOutlet = {};
    bills.forEach((b) => {
      billsByOutlet[b.outlet_id] = (billsByOutlet[b.outlet_id] || 0) + 1;
    });
    console.log(billsByOutlet);
    console.log('Sample bill:', bills[0] ? bills[0].toJSON() : 'No bills found');
  } catch (err) {
    console.error('Error inspecting DB:', err);
  } process.exit(0);
}

inspect();
