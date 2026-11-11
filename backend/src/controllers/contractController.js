const { sequelize } = require('../models/db');
const { Op } = require('sequelize');
const {
  Contract,
  Staff,
  Role,
  ContractGroup,
  ContractType,
  ContractTypeTemplate,
  Shift,
  WorkWeek,
  LeaveType,
  HolidayOccasion,
} = require('../models');

// Helper to keep Staff status strictly synced with active contract presence
const syncStaffContractStatus = async (staffId, transaction = null) => {
  if (!staffId) return;
  try {
    const todayStr = localToday();
    const activeContract = await Contract.findOne({
      where: {
        employee_id: staffId,
        status: 'active',
        start_date: { [Op.lte]: todayStr },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: todayStr } }
        ]
      },
      transaction
    });

    const staff = await Staff.findByPk(staffId, { transaction });
    if (staff) {
      const isNowActive = Boolean(activeContract);
      await staff.update({
        status: isNowActive ? 'active' : 'inactive',
        onboarding_status: isNowActive ? 'approved' : staff.onboarding_status,
      }, { transaction });
    }
  } catch (err) {
    console.error('Failed to sync staff status from contract:', err.message);
  }
};

const { toContractResponse } = require('../services/contractResponse');
const { planContractChange, overlaps, localToday, error: contractError } = require('../services/contractTimeline');
const { snapshotTerms } = require('../services/contractTerms');
const { buildContractPolicies } = require('../services/contractPolicies');

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
    if (!payload.title) { await t.rollback(); return res.status(400).json({ message: 'Title is required.' }); }
    if (!payload.employeeId) { await t.rollback(); return res.status(400).json({ message: 'Employee is required.' }); }
    if (!payload.typeId) { await t.rollback(); return res.status(400).json({ message: 'Contract type is required.' }); }
    if (!payload.startDate) { await t.rollback(); return res.status(400).json({ message: 'Start date is required.' }); }

    // Generate contract code sequentially if new
    let contractCode = payload.code;
    if (!isEditing && !contractCode) {
      const year = new Date(payload.startDate).getFullYear();
      contractCode = 'CON-' + year + '-' + require('crypto').randomBytes(8).toString('hex').toUpperCase();
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
            [Op.or]: [
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

    const policyPayload = isEditing ? payload : {
      ...payload,
      selectedLeaves: payload.selectedLeaves ?? [],
      selectedHolidays: payload.selectedHolidays ?? [],
    };
    const policies = buildContractPolicies(policyPayload,
      payload.selectedLeaves !== undefined ? await LeaveType.findAll({ transaction: t }) : [],
      payload.selectedHolidays !== undefined ? await HolidayOccasion.findAll({ transaction: t }) : []);
    const flatFields = {
      ...policies,
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
      overtime_enabled: payload.allowOvertime !== undefined ? !!payload.allowOvertime : !!payload.overtime?.enabled,
      overtime_type: payload.overtime?.type || '1.5x',
      overtime_calculation: payload.overtime?.rateCalculation || 'fixed_hourly',
      overtime_rate: payload.overtime?.rateValue ? Number(payload.overtime.rateValue) : 0.00,
      current_version: payload.currentVersion ? Number(payload.currentVersion) : 1,
    };

    // Serialize all changes for this employee, for contract updates.
    const employee = await Staff.findByPk(flatFields.employee_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!employee) contractError('Employee not found.', 400);
    const allContracts = await Contract.findAll({ where: { employee_id: flatFields.employee_id }, transaction: t, lock: t.LOCK.UPDATE });
    let contract = isEditing ? allContracts.find(c => Number(c.id) === Number(payload.id)) : null;
    if (isEditing && !contract) contractError('Contract not found for this employee.', 404);
    const predecessor = !isEditing && payload.previousContractId ? allContracts.find(c => Number(c.id) === Number(payload.previousContractId)) : null;
    if (payload.previousContractId && !predecessor && !isEditing) contractError('Previous contract not found for this employee.', 400);
    if (predecessor && !flatFields.group_id) contractError('Select a contract group covering the revision period.', 400);
    const group = flatFields.group_id ? await ContractGroup.findByPk(flatFields.group_id, { transaction: t, lock: t.LOCK.UPDATE }) : null;
    if (flatFields.group_id && !group) contractError('Contract group not found.', 400);
    const candidate = { ...flatFields, id: contract?.id };
    const plan = planContractChange({ candidate, previous: contract || predecessor, others: allContracts, group, isEditing });
    if (predecessor) {
      flatFields.previous_contract_id = predecessor.id;
      flatFields.current_version = Number(predecessor.current_version || 1) + 1;
      if (plan.predecessorEnd) await predecessor.update({ original_end_date: predecessor.original_end_date || predecessor.end_date, end_date: plan.predecessorEnd }, { transaction: t });
    }
    if (contract) await contract.update(flatFields, { transaction: t });
    else {
      flatFields.code = contractCode;
      contract = await Contract.create(flatFields, { transaction: t });
    }


    // Reload contract with full associations
    const reloadedContract = await Contract.findByPk(contract.id, {
      transaction: t,
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
      ],
    });

    await reloadedContract.update({ terms_snapshot: snapshotTerms(reloadedContract) }, { transaction: t });
    await t.commit();
    await syncStaffContractStatus(flatFields.employee_id);
    return res.json(toContractResponse(reloadedContract));
  } catch (err) {
    if (!t.finished) await t.rollback();
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Server error saving contract.' });
  }
};

const remove = async (req, res) => {
  try {
    await sequelize.transaction(async transaction => {
      const existing = await Contract.findByPk(req.params.id, { transaction });
      if (!existing) contractError('Contract not found.', 404);
      await Staff.findByPk(existing.employee_id, { transaction, lock: transaction.LOCK.UPDATE });
      const contract = await Contract.findByPk(existing.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (contract.document_metadata) contractError('A contract with an uploaded document must be preserved and cannot be deleted.');
      if (contract.status === 'active' && contract.start_date <= localToday()) contractError('Started contracts are history and cannot be deleted. Create a revision instead.');
      if (await Contract.findOne({ where: { previous_contract_id: contract.id }, transaction })) contractError('A contract with revisions cannot be deleted.');
      await contract.destroy({ transaction });
    });
    return res.json({ success: true });
  } catch (err) { return res.status(err.status || 500).json({ message: err.status ? err.message : 'Unable to delete contract.' }); }
};

module.exports = {
  getAll,
  getOne,
  createOrUpdate,
  remove,
};
