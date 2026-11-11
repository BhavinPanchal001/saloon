/**
 * Seed dummy attendance records for testing payroll calculations.
 * Populates realistic Present days, Sunday weekly-offs, check-in/out timestamps, and lunch breaks
 * for September and October 2026.
 *
 * Usage: node scripts/seed-dummy-attendance.cjs
 */
const path = require('path');
const { sequelize, Attendance, Staff } = require('../backend/src/models');
const { Op } = require(path.resolve(__dirname, '../backend/node_modules/sequelize'));

function getDaysInMonth(year, month) {
  const count = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 1; i <= count; i++) {
    const dayStr = String(i).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    days.push(`${year}-${monthStr}-${dayStr}`);
  }
  return days;
}

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Target staff members: 1 (Demo saddd), 2 (Manisha sa), 4 (Nishi Avadhiya)
    const staffMembers = await Staff.findAll({
      where: { id: { [Op.in]: [1, 2, 4] } },
      attributes: ['id', 'first_name', 'last_name']
    });

    if (!staffMembers.length) {
      console.log('No matching staff members found.');
      process.exit(0);
    }

    console.log(`Found ${staffMembers.length} staff members:`, staffMembers.map(s => `${s.id}: ${s.first_name} ${s.last_name}`).join(', '));

    // Target months: September 2026 (month 9) and October 2026 (month 10)
    const dates = [
      ...getDaysInMonth(2026, 9),
      ...getDaysInMonth(2026, 10),
    ];

    const records = [];

    for (const staff of staffMembers) {
      for (const date of dates) {
        const d = new Date(date + 'T00:00:00+05:30');
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

        if (dayOfWeek === 0) {
          // Sunday is a standard weekly off
          records.push({
            staff_id: staff.id,
            date,
            status: 'weekly_off',
            check_in: null,
            check_out: null,
            breaks: []
          });
        } else if (staff.id === 1 && date === '2026-09-15') {
          // Add 1 half day for Demo saddd to test half day deduction calculation
          records.push({
            staff_id: staff.id,
            date,
            status: 'half_day',
            check_in: { timestamp: `${date}T09:00:00+05:30` },
            check_out: { timestamp: `${date}T13:30:00+05:30` },
            breaks: []
          });
        } else if (staff.id === 4 && date === '2026-10-14') {
          // Add 1 approved paid leave for Nishi Avadhiya to test paid leave calculation
          records.push({
            staff_id: staff.id,
            date,
            status: 'paid_leave',
            check_in: null,
            check_out: null,
            breaks: []
          });
        } else {
          // Standard full shift matching contract shift: 09:00 to 21:00 with 90 min break (13:30 to 15:00)
          records.push({
            staff_id: staff.id,
            date,
            status: 'present',
            check_in: { timestamp: `${date}T09:00:00+05:30` },
            check_out: { timestamp: `${date}T21:00:00+05:30` },
            breaks: [{ in: `${date}T13:30:00+05:30`, out: `${date}T15:00:00+05:30` }]
          });
        }
      }
    }

    console.log(`Deleting existing attendance records for Sep & Oct 2026...`);
    await Attendance.destroy({
      where: {
        staff_id: { [Op.in]: staffMembers.map(s => s.id) },
        date: { [Op.between]: ['2026-09-01', '2026-10-31'] }
      }
    });

    console.log(`Inserting ${records.length} realistic attendance records...`);
    // Insert in batches of 50
    for (let i = 0; i < records.length; i += 50) {
      await Attendance.bulkCreate(records.slice(i, i + 50));
    }

    console.log(`Successfully seeded ${records.length} attendance records for Sep and Oct 2026!`);
  } catch (err) {
    console.error('Error seeding dummy attendance:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seed();
