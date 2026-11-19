// One-time, non-destructive sample data for Demo saddd, October 2026.
const { sequelize, Staff, Contract, WorkWeek, Attendance, LeaveRequest, LeaveType } = require('../backend/src/models');
const { Op, Transaction } = require('../backend/node_modules/sequelize');
const { contractForDate } = require('../backend/src/services/contractTimeline');
const { termsFor } = require('../backend/src/services/contractTerms');
const { calculateLeave } = require('../backend/src/services/leaveValidation');

const staffId = 1;
const start = '2026-10-01';
const end = '2026-10-31';
const leaveDate = '2026-10-31';
const shortDays = new Set(['2026-10-08', '2026-10-20']);
const earlyDay = '2026-10-26';
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function main() {
  await sequelize.authenticate();
  await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
    const staff = await Staff.findByPk(staffId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!staff || staff.first_name !== 'Demo' || staff.last_name !== 'saddd' || !staff.user_id) throw new Error('Employee identity or linked login does not match.');
    const contracts = await Contract.findAll({ where: { employee_id: staffId }, include: [{ model: WorkWeek, as: 'workWeek' }], transaction });
    const existing = await Attendance.count({ where: { staff_id: staffId, date: { [Op.between]: [start, end] } }, transaction });
    const requests = await LeaveRequest.count({ where: { staff_id: staffId, start_date: { [Op.lte]: end }, end_date: { [Op.gte]: start }, status: { [Op.in]: ['pending', 'approved'] } }, transaction });
    if (existing || requests) throw new Error('October already has attendance or pending/approved leave; no records were changed.');
    const type = await LeaveType.findByPk(1, { transaction });
    const leave = calculateLeave({ contracts, leaveType: type, startDate: leaveDate, endDate: leaveDate, duration: 'full', today: '2026-11-19' });
    if (!type || type.needed_document || !leave.allocation.isPaid || leave.days !== 1) throw new Error('The chosen sample leave does not meet the contract rules.');
    const counts = { present: 0, half_day: 0, weekly_off: 0 };
    for (let day = 1; day <= 31; day++) {
      const date = `2026-10-${String(day).padStart(2, '0')}`;
      const contract = contractForDate(contracts, date);
      const terms = contract && termsFor(contract);
      if (!contract || !terms.shift || !terms.workWeek?.operational_days?.length) throw new Error(`Missing contract schedule on ${date}.`);
      const holiday = (contract.holiday_configuration || []).some(h => h.startDate <= date && (h.endDate || h.startDate) >= date);
      if (holiday) throw new Error(`A contract holiday exists on ${date}; review before adding sample data.`);
      if (date === leaveDate) continue;
      const working = terms.workWeek.operational_days.includes(dayNames[new Date(`${date}T00:00:00Z`).getUTCDay()]);
      if (!working) {
        await Attendance.create({ staff_id: staffId, date, status: 'weekly_off', breaks: [] }, { transaction });
        counts.weekly_off++;
        continue;
      }
      if (terms.shift.start_time !== '09:00' || terms.shift.end_time !== '21:00' || Number(terms.shift.break_duration) !== 90) throw new Error(`Shift changed on ${date}; review sample times.`);
      const status = shortDays.has(date) ? 'half_day' : 'present';
      const checkout = status === 'half_day' ? '15:00:00' : date === earlyDay ? '19:30:00' : '21:00:00';
      const sample = { sample_data: true, shiftName: terms.shift.name };
      await Attendance.create({ staff_id: staffId, date, status, check_in: { ...sample, timestamp: `${date}T09:00:00+05:30`, shiftStartTime: '09:00', isLate: false, lateMinutes: 0 }, check_out: { ...sample, timestamp: `${date}T${checkout}+05:30`, shiftEndTime: '21:00', isEarlyCheckout: checkout !== '21:00:00', earlyMinutes: checkout === '15:00:00' ? 360 : checkout === '19:30:00' ? 90 : 0 }, breaks: [{ in: `${date}T13:00:00+05:30`, out: `${date}T14:30:00+05:30`, sample_data: true }] }, { transaction });
      counts[status]++;
    }
    await LeaveRequest.create({ staff_id: staffId, contract_id: leave.contract.id, leave_type_id: type.id, start_date: leaveDate, end_date: leaveDate, duration: 'full', days: leave.days, dates: JSON.stringify(leave.dates), reason: '[SAMPLE DATA] Annual leave for salary calculation testing.', status: 'pending', created_by: staff.user_id }, { transaction });
    console.log(JSON.stringify({ staffId, month: '2026-10', attendance: counts, pendingLeave: { date: leaveDate, contractId: leave.contract.id, leaveType: type.name }, shortDays: [...shortDays], earlyDay }, null, 2));
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
