const { ProcessedPayroll, ProcessedPayrollDetail, Staff, Outlet, sequelize } = require('../models');

const getPayrolls = async (req, res) => {
  try {
    const { outletId, monthKey } = req.query;
    const where = {};

    if (outletId && outletId !== 'all' && outletId !== 'undefined' && outletId !== 'null') {
      where.outlet_id = outletId;
    }
    if (monthKey) {
      where.month_key = monthKey;
    }

    const payrolls = await ProcessedPayroll.findAll({
      where,
      include: [{ model: Outlet, attributes: ['id', 'name', 'code'] }],
      order: [['month_key', 'DESC']]
    });

    // Format response to fit expected frontend layout properties
    const formatted = payrolls.map(p => ({
      id: p.id,
      month: p.month_key,
      month_key: p.month_key,
      outletId: p.outlet_id,
      outletName: p.Outlet ? p.Outlet.name : 'All Outlets',
      employeeCount: p.employee_count,
      totalSalary: Number(p.total_salary),
      totalTax: Number(p.total_tax),
      totalDeductAmount: Number(p.total_deduct),
      totalPayableSalary: Number(p.total_payable),
      totalPaidSalary: Number(p.total_paid),
      remainingSalary: Number(p.remaining),
      status: p.status,
      ptPaidDate: p.pt_paid_date,
      bankAccountId: p.bank_account_id,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving payroll list.' });
  }
};

const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await ProcessedPayroll.findByPk(id, {
      include: [
        { model: Outlet, attributes: ['id', 'name', 'code'] },
        {
          model: ProcessedPayrollDetail,
          as: 'details',
          include: [{ model: Staff, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'phone', 'email'] }]
        }
      ]
    });

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll run not found.' });
    }

    return res.json(payroll);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error retrieving payroll details.' });
  }
};

const createPayroll = async (req, res) => {
  try {
    const { monthKey, outletId, details } = req.body;
    if (!monthKey) return res.status(400).json({ message: 'Month key is required.' });
    if (!details || !Array.isArray(details)) return res.status(400).json({ message: 'Details array is required.' });

    const formattedOutletId = outletId === 'all' || !outletId ? null : Number(outletId);

    // If an existing run for this month and outlet exists, remove it first to allow overwrite/recalculate
    const existing = await ProcessedPayroll.findOne({
      where: { month_key: monthKey, outlet_id: formattedOutletId }
    });
    if (existing) {
      await existing.destroy();
    }

    let employeeCount = details.length;
    let totalSalary = 0;
    let totalTax = 0;
    let totalDeduct = 0;
    let totalPayable = 0;
    let totalPaid = 0;

    details.forEach(d => {
      totalSalary += Number(d.baseSalary || 0);
      totalTax += Number(d.professionalTax || 0);
      totalDeduct += Number(d.deductionAmount || 0);
      totalPayable += Number(d.finalSalary || 0);
      const isPaid = d.status === 'paid';
      totalPaid += isPaid ? Number(d.finalSalary || 0) : 0;
    });
    const remaining = totalPayable - totalPaid;

    const payroll = await ProcessedPayroll.create({
      month_key: monthKey,
      outlet_id: formattedOutletId,
      employee_count: employeeCount,
      total_salary: totalSalary,
      total_tax: totalTax,
      total_deduct: totalDeduct,
      total_payable: totalPayable,
      total_paid: totalPaid,
      remaining: remaining,
      status: remaining === 0 ? 'paid' : (totalPaid > 0 ? 'pending' : 'calculated'),
    });

    const detailsToCreate = details.map(d => ({
      processed_payroll_id: payroll.id,
      staff_id: d.employeeId || d.id,
      base_salary: Number(d.baseSalary || 0),
      tax: Number(d.professionalTax || 0),
      deduction: Number(d.deductionAmount || 0),
      payable: Number(d.finalSalary || 0),
      paid: d.status === 'paid' ? Number(d.finalSalary || 0) : 0,
      remaining: d.status === 'paid' ? 0 : Number(d.finalSalary || 0),
      status: d.status || 'calculated',
      present_days: Number(d.present || 0),
      absent_days: Number(d.absent || 0),
      leave_days: Number(d.leaves || 0),
      overtime_hours: Number(d.overtime || 0),
      commission_amount: Number(d.commission || 0),
    }));

    await ProcessedPayrollDetail.bulkCreate(detailsToCreate);

    return res.status(201).json(payroll);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving payroll.' });
  }
};

const payPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankAccountId, paymentDate } = req.body;
    if (!paymentDate) return res.status(400).json({ message: 'Payment date is required.' });
    if (!bankAccountId) return res.status(400).json({ message: 'Bank account is required.' });

    const payroll = await ProcessedPayroll.findByPk(id);
    if (!payroll) return res.status(404).json({ message: 'Payroll run not found.' });

    await payroll.update({
      total_paid: payroll.total_payable,
      remaining: 0.00,
      status: 'paid',
      pt_paid_date: paymentDate,
      bank_account_id: bankAccountId,
    });

    await ProcessedPayrollDetail.update(
      {
        paid: sequelize.col('payable'),
        remaining: 0.00,
        status: 'paid'
      },
      { where: { processed_payroll_id: id } }
    );

    return res.json(payroll);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error processing payroll payment.' });
  }
};

const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await ProcessedPayroll.findByPk(id);
    if (!payroll) return res.status(404).json({ message: 'Payroll run not found.' });
    await payroll.destroy();
    return res.json({ success: true, message: 'Payroll run deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting payroll run.' });
  }
};

module.exports = {
  getPayrolls,
  getPayrollById,
  createPayroll,
  payPayroll,
  deletePayroll
};
