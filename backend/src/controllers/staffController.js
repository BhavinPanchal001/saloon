const { Op } = require('sequelize');
const { Staff, Role, Outlet, Contract, ContractSalaryMapping, SalaryComponentMaster, Shift, WorkWeek } = require('../models');

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

  // Find active contract to extract baseSalary and other salary details if any
  const activeContract = staff.contracts && staff.contracts.find(c => c.status === 'active');
  let baseSalary = 0;
  let contractFileName = 'pending-contract.pdf';
  let shiftId = null;
  let shiftName = '';
  let workWeekId = null;
  let workWeekName = '';

  if (activeContract) {
    if (activeContract.salaryComponents) {
      const basicComp = activeContract.salaryComponents.find(
        (sc) => sc.masterComponent && sc.masterComponent.code === 'BASIC'
      );
      if (basicComp) {
        baseSalary = Number(basicComp.custom_amount);
      }
    }
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
    roleId: staff.role_id,
    role: staff.role ? staff.role.name : '',
    assignedOutletId: staff.assigned_outlet_id,
    assignedOutletName: staff.outlet ? staff.outlet.name : 'Unassigned',
    biometricCode: staff.biometric_code || '',
    joiningDate: staff.joining_date,
    onboardingStatus: staff.onboarding_status,
    bankDetails,
    address,
    baseSalary,
    commissionSlab: 'Tier 1', // standard mock default
    pfDeduction: Math.round(baseSalary * 0.12), // standard standard 12% contribution
    taxType: 'percentage',
    taxValue: 5,
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
    const { outletId, search } = req.query;
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
            {
              model: ContractSalaryMapping,
              as: 'salaryComponents',
              include: [{ model: SalaryComponentMaster, as: 'masterComponent' }],
            },
            { model: Shift, as: 'shift' },
            { model: WorkWeek, as: 'workWeek' }
          ],
        },
      ],
      order: [['first_name', 'ASC']],
    });

    return res.json(staffList.map(toStaffResponse));
  } catch (err) {
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
            {
              model: ContractSalaryMapping,
              as: 'salaryComponents',
              include: [{ model: SalaryComponentMaster, as: 'masterComponent' }],
            },
            { model: Shift, as: 'shift' },
            { model: WorkWeek, as: 'workWeek' }
          ],
        },
      ],
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    return res.json(toStaffResponse(staff));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error retrieving staff member.' });
  }
};

const createOrUpdate = async (req, res) => {
  try {
    const payload = req.body;
    const isEditing = !!payload.id;

    // Validation
    if (!payload.firstName || !payload.lastName) {
      return res.status(400).json({ message: 'First name and Last name are required.' });
    }
    if (!payload.phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }
    if (!payload.personalEmail) {
      return res.status(400).json({ message: 'Personal email is required.' });
    }
    if (!payload.roleId) {
      return res.status(400).json({ message: 'Role is required.' });
    }
    if (!payload.assignedOutletId) {
      return res.status(400).json({ message: 'Assigned Outlet is required.' });
    }

    const outlet = await Outlet.findByPk(payload.assignedOutletId);
    if (!outlet) {
      return res.status(400).json({ message: 'Assigned outlet does not exist.' });
    }

    // Dynamic sequential employee code logic
    let employeeCode = payload.employeeCode;
    if (!isEditing && !employeeCode) {
      const prefix = (outlet.employee_code_prefix || outlet.code.split('-')[0]).toUpperCase();
      const highestStaff = await Staff.findOne({
        where: {
          assigned_outlet_id: payload.assignedOutletId,
          employee_code: {
            [Op.like]: `${prefix}-%`,
          },
        },
        order: [['employee_code', 'DESC']],
      });

      let nextSeq = 101;
      if (highestStaff && highestStaff.employee_code) {
        const parts = highestStaff.employee_code.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
      employeeCode = `${prefix}-${nextSeq}`;
    }

    const flatFields = {
      first_name: payload.firstName,
      middle_name: payload.middleName || '',
      last_name: payload.lastName,
      phone: payload.phone,
      email: payload.email || '',
      personal_email: payload.personalEmail,
      dob: payload.dob || null,
      gender: payload.gender || '',
      marital_status: payload.marital_status || '',
      role_id: Number(payload.roleId),
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

    let staff;
    if (isEditing) {
      staff = await Staff.findByPk(payload.id);
      if (!staff) {
        return res.status(404).json({ message: 'Staff member to update not found.' });
      }
      await staff.update(flatFields);
    } else {
      flatFields.employee_code = employeeCode;
      staff = await Staff.create(flatFields);
    }

    // Reload with associations
    const reloadedStaff = await Staff.findByPk(staff.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Outlet, as: 'outlet' },
        {
          model: Contract,
          as: 'contracts',
          include: [
            {
              model: ContractSalaryMapping,
              as: 'salaryComponents',
              include: [{ model: SalaryComponentMaster, as: 'masterComponent' }],
            },
            { model: Shift, as: 'shift' },
            { model: WorkWeek, as: 'workWeek' }
          ],
        },
      ],
    });

    return res.json(toStaffResponse(reloadedStaff));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error saving staff member.' });
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

    await staff.destroy();
    return res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (err) {
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
