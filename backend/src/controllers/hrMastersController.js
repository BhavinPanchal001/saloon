const {
  Role,
  Shift,
  LeaveType,
  WorkWeek,
  ContractType,
  ContractTypeTemplate,
  HolidayTemplate,
  HolidayOccasion,
  ContractGroup,
  Staff
} = require('../models');

// Helpers for responses (camelCase mapping)
const toRoleResponse = (role) => ({
  id: role.id,
  name: role.name,
  description: role.description || '',
  isActive: role.is_active,
  isEmployee: role.is_employee,
  permissions: Array.isArray(role.permissions) ? role.permissions : [],
});

const toShiftResponse = (shift) => ({
  id: shift.id,
  name: shift.name,
  startTime: shift.start_time,
  endTime: shift.end_time,
  breakDuration: shift.break_duration,
  gracePeriod: shift.grace_period,
  isActive: shift.is_active,
});

const toLeaveTypeResponse = (lt) => ({
  id: lt.id,
  name: lt.name,
  code: lt.code,
  daysAllowed: lt.days_allowed,
  maxMonthly: lt.max_monthly,
  advanceNoticeDays: lt.advance_notice_days,
  isPaid: lt.is_paid,
  allowAnytime: lt.allow_anytime,
  allowHourly: lt.allow_hourly,
  hourlyHours: lt.hourly_hours,
  neededDocument: lt.needed_document,
});

const toWorkWeekResponse = (ww) => ({
  id: ww.id,
  name: ww.name,
  operationalDays: Array.isArray(ww.operational_days) ? ww.operational_days : [],
  isActive: ww.is_active,
});

const toContractTypeResponse = (ct) => ({
  id: ct.id,
  name: ct.name,
  code: ct.code,
  description: ct.description || '',
  isActive: ct.is_active,
  requiredDocuments: (ct.templates || []).map((t) => ({
    id: t.id,
    templateName: t.template_name,
    version: t.version,
    templateContent: t.template_content,
  })),
});

const toHolidayTemplateResponse = (ht) => ({
  id: ht.id,
  name: ht.name,
  type: ht.type,
  description: ht.description || '',
  isRecurring: ht.is_recurring,
  isActive: ht.is_active,
});

const toHolidayResponse = (hol) => ({
  id: hol.id,
  templateId: hol.holiday_template_id,
  occasionName: hol.occasion_name,
  startDate: hol.start_date,
  endDate: hol.end_date,
  occasionType: hol.occasion_type,
  description: hol.description || '',
  isActive: hol.is_active,
});

const toContractGroupResponse = (cg) => ({
  id: cg.id,
  name: cg.name,
  duration: cg.duration || '12 Months',
  startDate: cg.start_date,
  endDate: cg.end_date || '',
  employeeId: cg.employee_id || '',
  employeeName: cg.employee ? `${cg.employee.first_name} ${cg.employee.last_name}`.trim() : '',
  employeeCode: cg.employee?.staff_code || cg.employee?.biometric_code || 'EMP001',
  status: cg.status || 'Active',
  description: cg.description || '',
});


const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [['name', 'ASC']] });
    return res.json(roles.map(toRoleResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving roles.' });
  }
};

const saveRole = async (req, res) => {
  try {
    const { id, name, description, isActive, isEmployee, permissions } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const fields = {
      name,
      description: description || '',
      is_active: isActive !== undefined ? !!isActive : true,
      is_employee: isEmployee !== undefined ? !!isEmployee : true,
      ...(permissions !== undefined ? { permissions: Array.isArray(permissions) ? permissions.filter(p => typeof p === 'string') : [] } : {}),
    };

    let role;
    if (id) {
      role = await Role.findByPk(id);
      if (!role) return res.status(404).json({ message: 'Role not found.' });
      await role.update(fields);
    } else {
      role = await Role.create(fields);
    }
    return res.json(toRoleResponse(role));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving role.' });
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found.' });
    await role.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting role.' });
  }
};

const toggleRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found.' });
    await role.update({ is_active: !role.is_active });
    return res.json(toRoleResponse(role));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error toggling role.' });
  }
};

// ─── 2. SHIFTS CONTROLLER ─────────────────────────────────────────────────────
const getShifts = async (req, res) => {
  try {
    const shifts = await Shift.findAll({ order: [['name', 'ASC']] });
    return res.json(shifts.map(toShiftResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving shifts.' });
  }
};

const saveShift = async (req, res) => {
  try {
    const { id, name, startTime, endTime, breakDuration, gracePeriod, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const fields = {
      name,
      start_time: startTime || '09:00',
      end_time: endTime || '18:00',
      break_duration: breakDuration !== undefined ? Number(breakDuration) : 60,
      grace_period: gracePeriod !== undefined ? Number(gracePeriod) : 15,
      is_active: isActive !== undefined ? !!isActive : true,
    };

    let shift;
    if (id) {
      shift = await Shift.findByPk(id);
      if (!shift) return res.status(404).json({ message: 'Shift not found.' });
      await shift.update(fields);
    } else {
      shift = await Shift.create(fields);
    }
    return res.json(toShiftResponse(shift));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving shift.' });
  }
};

const deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found.' });
    await shift.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting shift.' });
  }
};

const toggleShift = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found.' });
    await shift.update({ is_active: !shift.is_active });
    return res.json(toShiftResponse(shift));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error toggling shift.' });
  }
};

// ─── 3. LEAVE TYPES CONTROLLER ────────────────────────────────────────────────
const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll({ order: [['name', 'ASC']] });
    return res.json(leaveTypes.map(toLeaveTypeResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving leave types.' });
  }
};

const saveLeaveType = async (req, res) => {
  try {
    const {
      id,
      name,
      code,
      daysAllowed,
      maxMonthly,
      advanceNoticeDays,
      isPaid,
      allowAnytime,
      allowHourly,
      hourlyHours,
      neededDocument,
    } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const fields = {
      name,
      code: code || name.substring(0, 3).toUpperCase(),
      days_allowed: daysAllowed !== undefined ? Number(daysAllowed) : 12,
      max_monthly: maxMonthly !== undefined ? Number(maxMonthly) : 2,
      advance_notice_days: advanceNoticeDays !== undefined ? Number(advanceNoticeDays) : 7,
      is_paid: isPaid !== undefined ? !!isPaid : true,
      allow_anytime: allowAnytime !== undefined ? !!allowAnytime : false,
      allow_hourly: allowHourly !== undefined ? !!allowHourly : false,
      hourly_hours: hourlyHours !== undefined ? Number(hourlyHours) : 0,
      needed_document: neededDocument !== undefined ? !!neededDocument : false,
    };

    let lt;
    if (id) {
      lt = await LeaveType.findByPk(id);
      if (!lt) return res.status(404).json({ message: 'Leave type not found.' });
      await lt.update(fields);
    } else {
      lt = await LeaveType.create(fields);
    }
    return res.json(toLeaveTypeResponse(lt));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving leave type.' });
  }
};

const deleteLeaveType = async (req, res) => {
  try {
    const lt = await LeaveType.findByPk(req.params.id);
    if (!lt) return res.status(404).json({ message: 'Leave type not found.' });
    await lt.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting leave type.' });
  }
};

// ─── 4. WORK WEEKS CONTROLLER ─────────────────────────────────────────────────
const getWorkWeeks = async (req, res) => {
  try {
    const workWeeks = await WorkWeek.findAll({ order: [['name', 'ASC']] });
    return res.json(workWeeks.map(toWorkWeekResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving work weeks.' });
  }
};

const saveWorkWeek = async (req, res) => {
  try {
    const { id, name, operationalDays, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const fields = {
      name,
      operational_days: Array.isArray(operationalDays) ? operationalDays : [],
      is_active: isActive !== undefined ? !!isActive : true,
    };

    let ww;
    if (id) {
      ww = await WorkWeek.findByPk(id);
      if (!ww) return res.status(404).json({ message: 'Work week not found.' });
      await ww.update(fields);
    } else {
      ww = await WorkWeek.create(fields);
    }
    return res.json(toWorkWeekResponse(ww));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving work week.' });
  }
};

const deleteWorkWeek = async (req, res) => {
  try {
    const ww = await WorkWeek.findByPk(req.params.id);
    if (!ww) return res.status(404).json({ message: 'Work week not found.' });
    await ww.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting work week.' });
  }
};

const toggleWorkWeek = async (req, res) => {
  try {
    const ww = await WorkWeek.findByPk(req.params.id);
    if (!ww) return res.status(404).json({ message: 'Work week not found.' });
    await ww.update({ is_active: !ww.is_active });
    return res.json(toWorkWeekResponse(ww));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error toggling work week.' });
  }
};

// ─── 5. CONTRACT TYPES CONTROLLER ─────────────────────────────────────────────
const getContractTypes = async (req, res) => {
  try {
    const contractTypes = await ContractType.findAll({
      include: [{ model: ContractTypeTemplate, as: 'templates' }],
      order: [['name', 'ASC']],
    });
    return res.json(contractTypes.map(toContractTypeResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving contract types.' });
  }
};

const saveContractType = async (req, res) => {
  try {
    const { id, name, code, description, isActive, requiredDocuments } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const fields = {
      name,
      code: code || name.substring(0, 3).toUpperCase(),
      description: description || '',
      is_active: isActive !== undefined ? !!isActive : true,
    };

    let ct;
    if (id) {
      ct = await ContractType.findByPk(id);
      if (!ct) return res.status(404).json({ message: 'Contract type not found.' });
      await ct.update(fields);
    } else {
      ct = await ContractType.create(fields);
    }

    // Handle template creation or updates
    if (requiredDocuments && Array.isArray(requiredDocuments)) {
      for (const doc of requiredDocuments) {
        const templateFields = {
          contract_type_id: ct.id,
          template_name: doc.templateName || 'Standard Template',
          version: doc.version || '1.0',
          template_content: doc.templateContent || 'Agreement text...',
        };

        if (doc.id) {
          const t = await ContractTypeTemplate.findByPk(doc.id);
          if (t) await t.update(templateFields);
        } else {
          await ContractTypeTemplate.create(templateFields);
        }
      }
    }

    const reloaded = await ContractType.findByPk(ct.id, {
      include: [{ model: ContractTypeTemplate, as: 'templates' }],
    });

    return res.json(toContractTypeResponse(reloaded));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving contract type.' });
  }
};

const deleteContractType = async (req, res) => {
  try {
    const ct = await ContractType.findByPk(req.params.id);
    if (!ct) return res.status(404).json({ message: 'Contract type not found.' });
    await ct.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting contract type.' });
  }
};

const toggleContractType = async (req, res) => {
  try {
    const ct = await ContractType.findByPk(req.params.id);
    if (!ct) return res.status(404).json({ message: 'Contract type not found.' });
    await ct.update({ is_active: !ct.is_active });
    return res.json(toContractTypeResponse(ct));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error toggling contract type.' });
  }
};

// ─── 6. HOLIDAY TEMPLATES CONTROLLER ──────────────────────────────────────────
const getHolidayTemplates = async (req, res) => {
  try {
    const holidayTemplates = await HolidayTemplate.findAll({ order: [['name', 'ASC']] });
    return res.json(holidayTemplates.map(toHolidayTemplateResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving holiday templates.' });
  }
};

const saveHolidayTemplate = async (req, res) => {
  try {
    const { id, name, type, description, isRecurring, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const fields = {
      name,
      type: type || 'National',
      description: description || '',
      is_recurring: isRecurring !== undefined ? !!isRecurring : true,
      is_active: isActive !== undefined ? !!isActive : true,
    };

    let ht;
    if (id) {
      ht = await HolidayTemplate.findByPk(id);
      if (!ht) return res.status(404).json({ message: 'Holiday template not found.' });
      await ht.update(fields);
    } else {
      ht = await HolidayTemplate.create(fields);
    }
    return res.json(toHolidayTemplateResponse(ht));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving holiday template.' });
  }
};

const deleteHolidayTemplate = async (req, res) => {
  try {
    const ht = await HolidayTemplate.findByPk(req.params.id);
    if (!ht) return res.status(404).json({ message: 'Holiday template not found.' });
    await ht.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting holiday template.' });
  }
};

// ─── 7. HOLIDAYS (OCCASIONS) CONTROLLER ───────────────────────────────────────
const getHolidays = async (req, res) => {
  try {
    const holidays = await HolidayOccasion.findAll({ order: [['start_date', 'ASC']] });
    return res.json(holidays.map(toHolidayResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving holidays.' });
  }
};

const saveHoliday = async (req, res) => {
  try {
    const { id, templateId, occasionName, startDate, endDate, occasionType, description, isActive } = req.body;
    if (!occasionName) return res.status(400).json({ message: 'Occasion name is required.' });
    if (!templateId) return res.status(400).json({ message: 'Holiday Template ID is required.' });

    const fields = {
      holiday_template_id: Number(templateId),
      occasion_name: occasionName,
      start_date: startDate,
      end_date: endDate || startDate,
      occasion_type: occasionType || 'National',
      description: description || '',
      is_active: isActive !== undefined ? !!isActive : true,
    };

    let hol;
    if (id) {
      hol = await HolidayOccasion.findByPk(id);
      if (!hol) return res.status(404).json({ message: 'Holiday occasion not found.' });
      await hol.update(fields);
    } else {
      hol = await HolidayOccasion.create(fields);
    }
    return res.json(toHolidayResponse(hol));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving holiday occasion.' });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const hol = await HolidayOccasion.findByPk(req.params.id);
    if (!hol) return res.status(404).json({ message: 'Holiday occasion not found.' });
    await hol.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting holiday occasion.' });
  }
};

// ─── 8. CONTRACT GROUPS CONTROLLER ────────────────────────────────────────────
const getContractGroups = async (req, res) => {
  try {
    const contractGroups = await ContractGroup.findAll({
      include: [{ model: Staff, as: 'employee' }],
      order: [['name', 'ASC']],
    });
    return res.json(contractGroups.map(toContractGroupResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving contract groups.' });
  }
};

const saveContractGroup = async (req, res) => {
  try {
    const { Contract, sequelize } = require('../models');
    const { error, validDate } = require('../services/contractTimeline');
    const { id, name, duration, startDate, endDate, employeeId, status, description } = req.body;
    if (!name?.trim() || !validDate(startDate) || (endDate && (!validDate(endDate) || endDate < startDate))) error('Enter a group name and valid start/end dates.', 400);
    const result = await sequelize.transaction(async transaction => {
      const fields = { name: name.trim(), duration: duration || '12 Months', start_date: startDate, end_date: endDate || null, employee_id: employeeId ? Number(employeeId) : null, status: status || 'Active', description: description || null };
      let group;
      if (id) {
        group = await ContractGroup.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!group) error('Contract group not found.', 404);
        const contracts = await Contract.findAll({ where: { group_id: group.id }, transaction });
        if (contracts.some(contract => contract.start_date < startDate || (endDate && (!contract.end_date || contract.end_date > endDate)) || (employeeId && Number(contract.employee_id) !== Number(employeeId)))) error('Group changes would exclude existing contract history. Create a new group covering the new period.');
        await group.update(fields, { transaction });
      } else group = await ContractGroup.create(fields, { transaction });
      return ContractGroup.findByPk(group.id, { transaction, include: [{ model: Staff, as: 'employee' }] });
    });
    return res.json(toContractGroupResponse(result));
  } catch (err) { return res.status(err.status || 500).json({ message: err.status ? err.message : 'Unable to save contract group.' }); }
};

const deleteContractGroup = async (req, res) => {
  try {
    const { Contract, sequelize } = require('../models');
    const { error } = require('../services/contractTimeline');
    await sequelize.transaction(async transaction => {
      const group = await ContractGroup.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!group) error('Contract group not found.', 404);
      if (await Contract.count({ where: { group_id: group.id }, transaction })) error('A group containing contract history cannot be deleted.');
      await group.destroy({ transaction });
    });
    return res.json({ success: true });
  } catch (err) { return res.status(err.status || 500).json({ message: err.status ? err.message : 'Unable to delete contract group.' }); }
};






module.exports = {
  // Roles
  getRoles,
  saveRole,
  deleteRole,
  toggleRole,

  // Shifts
  getShifts,
  saveShift,
  deleteShift,
  toggleShift,

  // Leave Types
  getLeaveTypes,
  saveLeaveType,
  deleteLeaveType,

  // Work Weeks
  getWorkWeeks,
  saveWorkWeek,
  deleteWorkWeek,
  toggleWorkWeek,

  // Contract Types
  getContractTypes,
  saveContractType,
  deleteContractType,
  toggleContractType,

  // Holiday Templates
  getHolidayTemplates,
  saveHolidayTemplate,
  deleteHolidayTemplate,

  // Holidays (Occasions)
  getHolidays,
  saveHoliday,
  deleteHoliday,

  // Contract Groups
  getContractGroups,
  saveContractGroup,
  deleteContractGroup,

};
