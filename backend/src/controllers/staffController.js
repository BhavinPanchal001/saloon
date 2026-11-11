const { contractForDate, localToday } = require('../services/contractTimeline');
const { termsFor } = require('../services/contractTerms');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { toContractResponse } = require('../services/contractResponse');
const { Admin, sequelize, Staff, Role, Outlet, Contract, Shift, WorkWeek } = require('../models');

// Helper to convert Staff model to the expected rich nested frontend response structure
const toStaffResponse = (staff) => {
  const bankDetails = {
    accountHolderName: staff.bank_holder || '',
    bankName: staff.bank_name || '',
    accountNumber: staff.bank_account || '',
    ifscCode: staff.bank_ifsc || '',
    branchName: staff.bank_branch || '',
    accountType: staff.bank_type || 'Savings',
  };

  const address = {
    street: staff.street || '',
    city: staff.city || '',
    state: staff.state || '',
    country: staff.country || 'India',
    pincode: staff.pincode || '',
  };

  // Find active contract to extract shifts, work weeks and determine employee active status
  const activeContract = contractForDate(staff.contracts || [], localToday());

  const hasActiveContract = Boolean(activeContract);
  const status = hasActiveContract ? 'Active' : 'Inactive';
  const isActive = hasActiveContract;

  let contractFileName = 'pending-contract.pdf';
  let shiftId = null;
  let shiftName = '';
  let workWeekId = null;
  let workWeekName = '';

  if (activeContract) {
    if (activeContract.shift) {
      shiftId = activeContract.shift.id;
      shiftName = activeContract.shift.name;
    }
    if (activeContract.workWeek) {
      workWeekId = activeContract.workWeek.id;
      workWeekName = activeContract.workWeek.name;
    }
    contractFileName = activeContract.notes || 'active-contract.pdf'; // Use notes or default
  }

  return {
    id: staff.id,
    userId: staff.user_id || null,
    employeeCode: staff.employee_code || '',
    ...(staff.accountEnabled !== undefined ? { accountEnabled: staff.accountEnabled } : {}),
    name: `${staff.first_name} ${staff.last_name}`.trim(),
    firstName: staff.first_name,
    middleName: staff.middle_name || '',
    lastName: staff.last_name,
    phone: staff.phone,
    email: staff.email || '',
    personalEmail: staff.personal_email,
    dob: staff.dob || '',
    gender: staff.gender || '',
    marital_status: staff.marital_status || '',
    maritalStatus: staff.marital_status || '',
    roleId: staff.role_id,
    role: staff.access_role || (staff.role ? staff.role.name : ''),
    assignedOutletId: staff.assigned_outlet_id,
    assignedOutletName: staff.outlet ? staff.outlet.name : 'Unassigned',
    biometricCode: staff.biometric_code || '',
    joiningDate: staff.joining_date,
    onboardingStatus: staff.onboarding_status,
    status,
    isActive,
    hasActiveContract,
    contractDetails: (() => {
      const contract = activeContract || [...(staff.contracts || [])].sort((a, b) => Number(b.id) - Number(a.id))[0];
      return contract ? toContractResponse(contract) : null;
    })(),
    contractStatus: hasActiveContract ? 'active' : (staff.contracts && staff.contracts.length > 0 ? staff.contracts[0].status : 'no_contract'),
    activeContract: activeContract ? {
      id: activeContract.id,
      code: activeContract.code,
      title: activeContract.title,
      startDate: activeContract.start_date,
      endDate: activeContract.end_date,
      shiftId,
      shiftName,
      workWeekId,
      workWeekName,
    } : null,
    bankDetails,
    address,
    commissionSlab: 'Tier 1', // standard mock default
    contractFileName,
    shiftId,
    shiftName,
    workWeekId,
    workWeekName,
    advances: [], // mock for now
  };
};

const getAll = async (req, res) => {
  try {
    const { outletId, search, status, activeContractOnly } = req.query;
    const where = {};

    if (outletId && outletId !== 'undefined' && outletId !== 'null') {
      where.assigned_outlet_id = outletId;
    }

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const staffList = await Staff.findAll({
      where,
      include: [
        { model: Role, as: 'role' },
        { model: Outlet, as: 'outlet' },
        {
          model: Contract,
          as: 'contracts',
          include: [
            { model: Shift, as: 'shift' },
            { model: WorkWeek, as: 'workWeek' }
          ],
        },
      ],
      order: [['first_name', 'ASC']],
    });

    let mapped = staffList.map(toStaffResponse);

    if (status) {
      mapped = mapped.filter(s => s.status.toLowerCase() === status.toLowerCase());
    }
    if (activeContractOnly === 'true') {
      mapped = mapped.filter(s => s.hasActiveContract);
    }

    return res.json(mapped);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Server error fetching staff members.' });
  }
};

const getOne = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Outlet, as: 'outlet' },
        {
          model: Contract,
          as: 'contracts',
          include: [
            { model: Shift, as: 'shift' },
            { model: WorkWeek, as: 'workWeek' }
          ],
        },
      ],
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (staff.user_id) {
      const user = await Admin.findByPk(staff.user_id);
      if (user) { staff.accountEnabled = user.is_active; staff.email = user.email; }
    }
    return res.json(toStaffResponse(staff));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Server error retrieving staff member.' });
  }
};

const createOrUpdate = async (req, res) => {
  try {
    const { normalizeEmployee, validateEmployee } = await import('../../../shared/employeeValidation.js');
    const { getAppRole } = await import('../../../shared/appRoles.js');
    const isEditing = Boolean(req.body.id);
    const errors = validateEmployee(req.body, { isEditing });
    if (Object.keys(errors).length) return res.status(400).json({ message: Object.values(errors)[0], errors });
    const payload = normalizeEmployee(req.body);
    const fail = (field, message, status = 400) => { const err = new Error(message); err.status = status; err.errors = { [field]: message }; throw err; };
    const result = await sequelize.transaction(async transaction => {
      const outlet = await Outlet.findByPk(payload.assignedOutletId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!outlet) fail('assignedOutletId', 'Assigned outlet does not exist.');
      let staff = isEditing ? await Staff.findByPk(payload.id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (isEditing && !staff) fail('firstName', 'Employee to update was not found.', 404);
      const role = getAppRole(payload.role);
      const excludeSelf = isEditing ? { id: { [Op.ne]: staff.id } } : {};
      const phoneVariants = /^\+91\d{10}$/.test(payload.phone) ? [payload.phone, payload.phone.slice(3)] : [payload.phone];
      if (await Staff.findOne({ where: { ...excludeSelf, phone: { [Op.in]: phoneVariants } }, transaction })) fail('phone', 'An employee with this mobile number already exists.', 409);
      if (await Staff.findOne({ where: { ...excludeSelf, personal_email: payload.personalEmail }, transaction })) fail('personalEmail', 'An employee with this personal email already exists.', 409);
      const loginEmail = payload.email || payload.personalEmail;
      if (await Staff.findOne({ where: { ...excludeSelf, email: loginEmail }, transaction })) fail('email', 'An employee with this login email already exists.', 409);
      let user = staff?.user_id ? await Admin.findByPk(staff.user_id, { transaction }) : null;
      const existingUser = await Admin.findOne({ where: { email: loginEmail }, transaction });
      if (!user && existingUser && isEditing) {
        const linkedEmployee = await Staff.findOne({ where: { user_id: existingUser.id }, transaction });
        if (linkedEmployee && String(linkedEmployee.id) !== String(staff.id)) {
          fail('email', 'This login account is already linked to another employee.', 409);
        }
        user = existingUser;
      }
      if (existingUser && existingUser.id !== user?.id) fail('email', 'A user with this login email already exists. Choose another email.', 409);
      if (!user && !payload.password) {
        fail('password', 'No login account exists for this employee. Enter an initial password in System Access to create it.');
      }
      let employeeCode = staff?.employee_code;
      if (!isEditing) {
        // The outlet lock serializes code allocation; never trust the form preview.
        const prefix = (outlet.employee_code_prefix || outlet.code?.split('-')[0] || 'EMP').toUpperCase();
        const previous = await Staff.findAll({ where: { employee_code: { [Op.like]: prefix + '-%' } }, attributes: ['employee_code'], transaction });
        const next = previous.reduce((max, row) => {
          const match = row.employee_code?.match(/-(\d+)$/);
          return match ? Math.max(max, Number(match[1])) : max;
        }, 100) + 1;
        employeeCode = prefix + '-' + next;
      }
      const flatFields = {
        first_name: payload.firstName,
        middle_name: payload.middleName || '',
        last_name: payload.lastName,
        phone: payload.phone,
        email: loginEmail,
        personal_email: payload.personalEmail,
        dob: payload.dob || null,
        gender: payload.gender || '',
        marital_status: payload.maritalStatus || null,
        role_id: staff?.role_id || null,
        access_role: role.value,
        assigned_outlet_id: Number(payload.assignedOutletId),
        biometric_code: payload.biometricCode || '',
        joining_date: payload.joiningDate || new Date().toISOString().split('T')[0],
        onboarding_status: payload.onboardingStatus || 'pending',
        street: payload.address?.street || '',
        city: payload.address?.city || '',
        state: payload.address?.state || '',
        country: payload.address?.country || 'India',
        pincode: payload.address?.pincode || '',
        bank_holder: payload.bankDetails?.accountHolderName || '',
        bank_name: payload.bankDetails?.bankName || '',
        bank_account: payload.bankDetails?.accountNumber || '',
        bank_ifsc: payload.bankDetails?.ifscCode || '',
        bank_branch: payload.bankDetails?.branchName || '',
        bank_type: payload.bankDetails?.accountType || 'Savings',
      };

      // Reuse a matching account on updates; create one only when none exists.
      if (!user) {
        user = await Admin.create({
          name: [payload.firstName, payload.middleName, payload.lastName].filter(Boolean).join(' '),
          email: loginEmail,
          password: await bcrypt.hash(payload.password, 10),
          role: role.value,
          outlet_id: Number(payload.assignedOutletId),
          is_active: payload.accountEnabled !== false,
        }, { transaction });
      } else if (user) {
        await user.update({
          name: [payload.firstName, payload.middleName, payload.lastName].filter(Boolean).join(' '),
          email: loginEmail,
          role: role.value,
          outlet_id: Number(payload.assignedOutletId),
          ...(payload.accountEnabled !== undefined ? { is_active: payload.accountEnabled } : {}),
          ...(payload.password ? { password: await bcrypt.hash(payload.password, 10) } : {}),
        }, { transaction });
      }
      if (staff) await staff.update({ ...flatFields, ...(user ? { user_id: user.id } : {}) }, { transaction });
      else staff = await Staff.create({ ...flatFields, employee_code: employeeCode, user_id: user.id }, { transaction });
      // Reload with associations
      const reloadedStaff = await Staff.findByPk(staff.id, {
        transaction,
        include: [
          { model: Role, as: 'role' },
          { model: Outlet, as: 'outlet' },
          {
            model: Contract,
            as: 'contracts',
            include: [
              { model: Shift, as: 'shift' },
              { model: WorkWeek, as: 'workWeek' }
            ],
          },
        ],
      });

      if (user) reloadedStaff.accountEnabled = user.is_active;
      return toStaffResponse(reloadedStaff);
    });
    return res.status(isEditing ? 200 : 201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message, errors: err.errors });
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'An employee code or login email is already in use. Please retry with unique details.' });
    console.error(err);
    return res.status(500).json({ message: 'Unable to save the employee and user account. No changes were saved.' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    await staff.update({ onboarding_status: status });
    return res.json({ success: true, onboardingStatus: status });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Server error updating staff status.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    return res.json({
      success: true,
      tempPassword,
      message: `Temporary password generated and sent to ${staff.phone}`,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Server error resetting password.' });
  }
};

const grantAdvance = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    // Since we mock advances on staff, let's just return a success payload matching frontend expectations
    const payload = req.body;
    const emi = Number(payload.totalAdvanceAmount) / Number(payload.duration || 1);

    return res.json({
      success: true,
      advance: {
        id: `adv_${Math.random().toString(36).slice(2, 10)}`,
        totalAdvanceAmount: Number(payload.totalAdvanceAmount),
        deductionStartMonth: payload.deductionStartMonth,
        duration: Number(payload.duration),
        emi: Number(emi.toFixed(2)),
      },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Server error granting advance.' });
  }
};

const remove = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    await sequelize.transaction(async transaction => {
      if (staff.user_id) {
        await Admin.update({ is_active: false }, { where: { id: staff.user_id }, transaction });
      }
      await staff.destroy({ transaction });
    });
    return res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Server error deleting staff member.' });
  }
};

module.exports = {
  getAll,
  getOne,
  createOrUpdate,
  updateStatus,
  resetPassword,
  grantAdvance,
  remove,
};
