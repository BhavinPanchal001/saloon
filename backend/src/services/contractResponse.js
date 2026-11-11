const { localToday } = require('./contractTimeline');
const { termsFor } = require('./contractTerms');
const { readContractConfiguration } = require('./contractPolicies');

// Helper to convert DB Contract to rich nested frontend structure
const toContractResponse = (contract) => {
  const savedLeaves = readContractConfiguration(contract.leave_configuration);
  const savedHolidays = readContractConfiguration(contract.holiday_configuration);
  const terms = termsFor(contract);
  const shift = terms.shift;
  const workWeek = terms.workWeek;

  return {
    id: contract.id,
    previousContractId: contract.previous_contract_id || null,
    originalEndDate: contract.original_end_date || null,
    code: contract.code,
    title: contract.title,
    employeeId: contract.employee_id,
    employeeName: contract.employee
      ? `${contract.employee.first_name} ${contract.employee.last_name}`.trim()
      : 'Unknown',
    employeeRole: contract.employee?.access_role || contract.employee?.role?.name || '',
    groupId: contract.group_id || '',
    groupName: contract.group ? contract.group.name : '',
    typeId: contract.type_id,
    typeName: contract.contractType ? contract.contractType.name : '',
    templateId: contract.template_id || '',
    templateName: contract.documentTemplate ? contract.documentTemplate.template_name : '',
    templateContent: contract.documentTemplate?.template_content || '',
    startDate: contract.start_date,
    endDate: contract.end_date || '',
    status: contract.status,
    effectiveStatus: contract.status !== 'active' ? contract.status : contract.start_date > localToday() ? 'scheduled' : contract.end_date && contract.end_date < localToday() ? 'ended' : 'active',
    notes: contract.notes || '',
    shiftId: contract.shift_id || '',
    shiftName: shift ? shift.name : '',
    workWeekId: contract.work_week_id || '',
    workWeekName: workWeek ? workWeek.name : '',
    overtime: {
      enabled: contract.overtime_enabled,
      type: contract.overtime_type || '1.5x',
      rateCalculation: contract.overtime_calculation || 'fixed_hourly',
      rateValue: Number(contract.overtime_rate),
    },
    shiftStartTime: shift?.start_time || '',
    shiftEndTime: shift?.end_time || '',
    operationalDays: workWeek?.operational_days || [],
    weeklyOffPattern: Array.isArray(workWeek?.operational_days) ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].filter(day => !workWeek.operational_days.includes(day)) : [],
    leaveAllocations: savedLeaves || [],
    holidays: savedHolidays || [],
    leaveConfigurationSaved: savedLeaves !== null,
    holidayConfigurationSaved: savedHolidays !== null,
    selectedLeaves: (savedLeaves || []).map(leave => leave.id),
    leaveCounts: Object.fromEntries((savedLeaves || []).map(leave => [leave.id, leave.count])),
    selectedHolidays: (savedHolidays || []).map(holiday => holiday.id),
    probationPeriodMonths: contract.probation_period_months,
    noticePeriodDays: contract.notice_period_days,
    currentVersion: contract.current_version || 1,
  };
};


module.exports = { toContractResponse };
