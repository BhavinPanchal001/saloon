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

    // Safely parse or resolve numeric IDs to avoid NaN SQL errors
    const parseNumericId = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    // Resolve type_id safely
    let resolvedTypeId = parseNumericId(payload.typeId);
    if (!resolvedTypeId) {
      let foundType = null;
      if (payload.typeId) {
        foundType = await ContractType.findOne({
          where: {
            [sequelize.Op.or]: [
              { code: String(payload.typeId) },
              { name: String(payload.typeId) },
            ],
          },
          transaction: t,
        });
      }
      if (!foundType) {
        foundType = await ContractType.findOne({ transaction: t });
      }
      if (foundType) {
        resolvedTypeId = foundType.id;
      }
    }

    if (!resolvedTypeId) {
      await t.rollback();
      return res.status(400).json({ message: 'Valid contract type is required.' });
    }

    // Resolve template_id safely
    let resolvedTemplateId = parseNumericId(payload.templateId);
    if (!resolvedTemplateId && payload.templateId) {
      const foundTpl = await ContractTypeTemplate.findOne({ transaction: t });
      if (foundTpl) resolvedTemplateId = foundTpl.id;
    }

    const flatFields = {
      title: payload.title,
      employee_id: parseNumericId(payload.employeeId) || Number(payload.employeeId),
      group_id: parseNumericId(payload.groupId),
      type_id: resolvedTypeId,
      template_id: resolvedTemplateId,
      start_date: payload.startDate,
      end_date: payload.endDate || null,
      status: payload.status || 'active',
      notes: payload.notes || '',
      shift_id: parseNumericId(payload.shiftId),
      work_week_id: parseNumericId(payload.workWeekId),
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

      // Insert new ones safely
      const mappingsToInsert = payload.salaryComponents
        .map((sc) => {
          const compId = parseNumericId(sc.masterId) || parseNumericId(sc.salary_component_id) || parseNumericId(sc.id);
          if (!compId) return null;
          return {
            contract_id: contract.id,
            salary_component_id: compId,
            custom_amount: Number(sc.amount || sc.custom_amount || 0),
          };
        })
        .filter(Boolean);

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

    // Automatically update staff status and onboarding_status to approved/Active if contract status is active
    if (flatFields.status && String(flatFields.status).toLowerCase() === 'active') {
      const staff = await Staff.findByPk(flatFields.employee_id);
      if (staff) {
        await staff.update({ 
          onboarding_status: 'approved',
          status: 'Active',
          is_active: true 
        });
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
