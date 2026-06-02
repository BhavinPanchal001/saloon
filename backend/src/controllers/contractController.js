const { sequelize } = require('../models/db');
const {
  Contract,
  Staff,
  Role,
  ContractGroup,
  ContractType,
  ContractTypeTemplate,
  Shift,
  WorkWeek,
  ContractSalaryMapping,
  SalaryComponentMaster,
} = require('../models');

// Helper to convert DB Contract to rich nested frontend structure
const toContractResponse = (contract) => {
  const salaryComponents = (contract.salaryComponents || []).map((sc) => {
    const master = sc.masterComponent || {};
    return {
      id: master.id || sc.salary_component_id,
      name: master.name || '',
      code: master.code || '',
      type: master.type || 'earning',
      calculationType: master.calculation_type || 'fixed',
      amount: Number(sc.custom_amount),
    };
  });

  return {
    id: contract.id,
    code: contract.code,
    title: contract.title,
    employeeId: contract.employee_id,
    employeeName: contract.employee
      ? `${contract.employee.first_name} ${contract.employee.last_name}`.trim()
      : 'Unknown',
    employeeRole: contract.employee && contract.employee.role ? contract.employee.role.name : '',
    groupId: contract.group_id || '',
    groupName: contract.group ? contract.group.name : '',
    typeId: contract.type_id,
    typeName: contract.contractType ? contract.contractType.name : '',
    templateId: contract.template_id || '',
    templateName: contract.documentTemplate ? contract.documentTemplate.template_name : '',
    startDate: contract.start_date,
    endDate: contract.end_date || '',
    status: contract.status,
    notes: contract.notes || '',
    shiftId: contract.shift_id || '',
    shiftName: contract.shift ? contract.shift.name : '',
    workWeekId: contract.work_week_id || '',
    workWeekName: contract.workWeek ? contract.workWeek.name : '',
    overtime: {
      enabled: contract.overtime_enabled,
      type: contract.overtime_type || '1.5x',
      rateCalculation: contract.overtime_calculation || 'fixed_hourly',
      rateValue: Number(contract.overtime_rate),
    },
    salaryComponents,
    weeklyOffPattern: ['Sunday'], // static standard fallback
    currentVersion: contract.current_version || 1,
  };
};

const getAll = async (req, res) => {
  try {
    const contracts = await Contract.findAll({
      include: [
        {
          model: Staff,
          as: 'employee',
          include: [{ model: Role, as: 'role' }],
        },
        { model: ContractGroup, as: 'group' },
        { model: ContractType, as: 'contractType' },
        { model: ContractTypeTemplate, as: 'documentTemplate' },
        { model: Shift, as: 'shift' },
        { model: WorkWeek, as: 'workWeek' },
        {
          model: ContractSalaryMapping,
          as: 'salaryComponents',
          include: [{ model: SalaryComponentMaster, as: 'masterComponent' }],
        },
      ],
      order: [['id', 'DESC']],
    });

    return res.json(contracts.map(toContractResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error retrieving contracts.' });
  }
};

const getOne = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id, {
      include: [
        {
          model: Staff,
          as: 'employee',
          include: [{ model: Role, as: 'role' }],
        },
        { model: ContractGroup, as: 'group' },
        { model: ContractType, as: 'contractType' },
        { model: ContractTypeTemplate, as: 'documentTemplate' },
        { model: Shift, as: 'shift' },
        { model: WorkWeek, as: 'workWeek' },
        {
          model: ContractSalaryMapping,
          as: 'salaryComponents',
          include: [{ model: SalaryComponentMaster, as: 'masterComponent' }],
        },
      ],
    });

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found.' });
    }

    return res.json(toContractResponse(contract));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error retrieving contract.' });
  }
};

const createOrUpdate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = req.body;
    const isEditing = !!payload.id;

    // Validation
    if (!payload.title) return res.status(400).json({ message: 'Title is required.' });
    if (!payload.employeeId) return res.status(400).json({ message: 'Employee is required.' });
    if (!payload.typeId) return res.status(400).json({ message: 'Contract type is required.' });
    if (!payload.startDate) return res.status(400).json({ message: 'Start date is required.' });

    // Generate contract code sequentially if new
    let contractCode = payload.code;
    if (!isEditing && !contractCode) {
      const year = new Date(payload.startDate).getFullYear();
      const count = await Contract.count({ transaction: t });
      contractCode = `CON-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    const flatFields = {
      title: payload.title,
      employee_id: Number(payload.employeeId),
      group_id: payload.groupId ? Number(payload.groupId) : null,
      type_id: Number(payload.typeId),
      template_id: payload.templateId ? Number(payload.templateId) : null,
      start_date: payload.startDate,
      end_date: payload.endDate || null,
      status: payload.status || 'draft',
      notes: payload.notes || '',
      shift_id: payload.shiftId ? Number(payload.shiftId) : null,
      work_week_id: payload.workWeekId ? Number(payload.workWeekId) : null,
      overtime_enabled: !!payload.overtime?.enabled,
      overtime_type: payload.overtime?.type || '1.5x',
      overtime_calculation: payload.overtime?.rateCalculation || 'fixed_hourly',
      overtime_rate: payload.overtime?.rateValue ? Number(payload.overtime.rateValue) : 0.00,
      current_version: payload.currentVersion ? Number(payload.currentVersion) : 1,
    };

    let contract;
    if (isEditing) {
      contract = await Contract.findByPk(payload.id, { transaction: t });
      if (!contract) {
        await t.rollback();
        return res.status(404).json({ message: 'Contract not found.' });
      }
      await contract.update(flatFields, { transaction: t });
    } else {
      flatFields.code = contractCode;
      contract = await Contract.create(flatFields, { transaction: t });
    }

    // Handle contract salary mappings
    if (payload.salaryComponents && Array.isArray(payload.salaryComponents)) {
      // Remove existing mapping for this contract
      await ContractSalaryMapping.destroy({
        where: { contract_id: contract.id },
        transaction: t,
      });

      // Insert new ones
      const mappingsToInsert = payload.salaryComponents
        .filter((sc) => sc.id || sc.salary_component_id)
        .map((sc) => ({
          contract_id: contract.id,
          salary_component_id: Number(sc.id || sc.salary_component_id),
          custom_amount: Number(sc.amount || sc.custom_amount || 0),
        }));

      if (mappingsToInsert.length > 0) {
        await ContractSalaryMapping.bulkCreate(mappingsToInsert, { transaction: t });
      }
    }

    // Commit Transaction
    await t.commit();

    // Reload contract with full associations
    const reloadedContract = await Contract.findByPk(contract.id, {
      include: [
        {
          model: Staff,
          as: 'employee',
          include: [{ model: Role, as: 'role' }],
        },
        { model: ContractGroup, as: 'group' },
        { model: ContractType, as: 'contractType' },
        { model: ContractTypeTemplate, as: 'documentTemplate' },
        { model: Shift, as: 'shift' },
        { model: WorkWeek, as: 'workWeek' },
        {
          model: ContractSalaryMapping,
          as: 'salaryComponents',
          include: [{ model: SalaryComponentMaster, as: 'masterComponent' }],
        },
      ],
    });

    // Automatically update staff onboarding_status to approved if contract status is active
    if (flatFields.status === 'active') {
      const staff = await Staff.findByPk(flatFields.employee_id);
      if (staff && staff.onboarding_status !== 'approved') {
        await staff.update({ onboarding_status: 'approved' });
      }
    }

    return res.json(toContractResponse(reloadedContract));
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error saving contract.' });
  }
};

const remove = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found.' });
    }

    await contract.destroy();
    return res.json({ success: true, message: 'Contract deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error deleting contract.' });
  }
};

module.exports = {
  getAll,
  getOne,
  createOrUpdate,
  remove,
};
