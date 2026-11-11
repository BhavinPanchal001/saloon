const invalid = message => { const err = new Error(message); err.status = 400; throw err; };

const readContractConfiguration = value => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : null; }
    catch { return null; }
  }
  return null;
};

const buildContractPolicies = (payload, leaves, holidays) => {
  const fields = {};
  for (const [input, column] of [['probationPeriodMonths', 'probation_period_months'], ['noticePeriodDays', 'notice_period_days']]) {
    if (payload[input] !== undefined) {
      const value = Number(payload[input]);
      if (!Number.isSafeInteger(value) || value < 0) invalid(`${input} must be a non-negative whole number.`);
      fields[column] = value;
    }
  }
  if (payload.selectedLeaves !== undefined) {
    if (!Array.isArray(payload.selectedLeaves)) invalid('Selected leaves must be a list.');
    fields.leave_configuration = [...new Set(payload.selectedLeaves.map(String))].map(id => {
      const leave = leaves.find(item => String(item.id) === id);
      if (!leave) invalid('A selected leave type no longer exists. Reload the contract and select an available leave type.');
      const count = Number(payload.leaveCounts?.[id] ?? leave.days_allowed);
      if (!Number.isSafeInteger(count) || count < 0) invalid(`Enter a non-negative whole number of days for ${leave.name}.`);
      return { id: leave.id, name: leave.name, count, isPaid: Boolean(leave.is_paid) };
    });
  }
  if (payload.selectedHolidays !== undefined) {
    if (!Array.isArray(payload.selectedHolidays)) invalid('Selected holidays must be a list.');
    fields.holiday_configuration = [...new Set(payload.selectedHolidays.map(String))].map(id => {
      const holiday = holidays.find(item => String(item.id) === id);
      if (!holiday) invalid('A selected holiday no longer exists. Reload the contract and select an available holiday.');
      return { id: holiday.id, name: holiday.occasion_name, startDate: holiday.start_date, endDate: holiday.end_date, occasionType: holiday.occasion_type };
    });
  }
  return fields;
};

module.exports = { buildContractPolicies, readContractConfiguration };
