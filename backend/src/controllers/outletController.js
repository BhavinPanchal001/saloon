const { Op } = require('sequelize');
const Outlet = require('../models/Outlet');
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');
const PurchaseOrder = require('../models/PurchaseOrder');
const MonthlyBudget = require('../models/MonthlyBudget');

const toResponse = (outlet) => ({
  id: outlet.id,
  name: outlet.name,
  code: outlet.code,
  city: outlet.city,
  address: outlet.address || '',
  invoicePrefix: outlet.invoice_prefix || '',
  manager: outlet.manager || '',
  phone: outlet.phone || '',
  email: outlet.email || '',
  employeeCodePrefix: outlet.employee_code_prefix || '',
  status: outlet.status,
  createdAt: outlet.createdAt,
  updatedAt: outlet.updatedAt,
});

const getOutletFinancialSummary = async (req, res) => {
  try {
    const outletId = req.params.id;
    const { monthKey } = req.query;

    const outlet = await Outlet.findByPk(outletId);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });

    // Current month key fallback (e.g. 2026-07)
    const now = new Date();
    const currentMonthKey = monthKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Sales (Bills)
    const billWhere = { outlet_id: outletId, status: 'paid' };
    const bills = await Bill.findAll({ where: billWhere });

    // Filter by monthKey if provided
    const filteredBills = bills.filter(b => {
      if (!monthKey) return true;
      const bDate = new Date(b.createdAt);
      const bMonth = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`;
      return bMonth === monthKey;
    });

    const totalEarned = filteredBills.reduce((sum, b) => sum + Number(b.total || 0), 0);

    // 2. Expenses
    const expenseWhere = { outlet_id: outletId };
    if (monthKey) expenseWhere.month_key = monthKey;
    const expenses = await Expense.findAll({ where: expenseWhere });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

    // 3. Purchase Orders
    let filteredPOs = [];
    let totalPOCost = 0;
    try {
      const poWhere = { outlet_id: outletId };
      const pos = await PurchaseOrder.findAll({ where: poWhere });
      filteredPOs = pos.filter(po => {
        if (!monthKey) return true;
        if (!po.order_date) return true;
        return po.order_date.startsWith(monthKey);
      });
      totalPOCost = filteredPOs.reduce((sum, po) => sum + Number(po.total_cost || 0), 0);
    } catch (poErr) {
      console.warn('[Outlet Financial Summary] Could not query POs by outlet_id:', poErr.message);
    }

    // 4. Monthly Budget
    let budget = await MonthlyBudget.findOne({
      where: { outlet_id: outletId, month_key: currentMonthKey }
    });

    const assignedBudget = budget ? Number(budget.amount) : 0;
    const remainingBudget = Math.max(0, assignedBudget - totalExpenses);
    const spendPercentage = assignedBudget > 0 ? Math.min(100, Math.round((totalExpenses / assignedBudget) * 100)) : 0;

    // 5. Net Surplus / Deficit
    const netProfit = totalEarned - (totalExpenses + totalPOCost);

    return res.json({
      outlet: toResponse(outlet),
      monthKey: currentMonthKey,
      totalEarned,
      totalBillsCount: filteredBills.length,
      totalExpenses,
      expensesCount: expenses.length,
      totalPOCost,
      poCount: filteredPOs.length,
      assignedBudget,
      remainingBudget,
      spendPercentage,
      netProfit,
    });
  } catch (err) {
    console.error('[Outlet Financial Summary Error]', err);
    return res.status(500).json({ message: 'Server error fetching outlet summary.' });
  }
};

const getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'status must be active or inactive.' });
      }
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { manager: { [Op.like]: `%${search}%` } },
      ];
    }

    const outlets = await Outlet.findAll({ where, order: [['name', 'ASC']] });
    return res.json(outlets.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getOne = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });
    return res.json(toResponse(outlet));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  try {
    const { name, code, city, address, invoice_prefix, manager, phone, email, employeeCodePrefix, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'code is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ message: 'city is required.' });
    }

    const existing = await Outlet.findOne({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(409).json({ message: `Outlet code "${code.trim().toUpperCase()}" is already in use.` });
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'status must be active or inactive.' });
    }

    const outlet = await Outlet.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: city.trim(),
      address: (address || '').trim() || null,
      invoice_prefix: (invoice_prefix || '').trim() || null,
      manager: (manager || '').trim() || null,
      phone: (phone || '').trim() || null,
      email: (email || '').trim() || null,
      employee_code_prefix: (employeeCodePrefix || '').trim() || null,
      status: status || 'active',
    });

    return res.status(201).json(toResponse(outlet));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });

    const { name, code, city, address, invoice_prefix, manager, phone, email, employeeCodePrefix, status } = req.body;

    if (code && code.trim().toUpperCase() !== outlet.code) {
      const dup = await Outlet.findOne({
        where: { code: code.trim().toUpperCase(), id: { [Op.ne]: outlet.id } },
      });
      if (dup) {
        return res.status(409).json({ message: `Outlet code "${code.trim().toUpperCase()}" is already in use.` });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (code !== undefined) updates.code = code.trim().toUpperCase();
    if (city !== undefined) updates.city = city.trim();
    if (address !== undefined) updates.address = address.trim() || null;
    if (invoice_prefix !== undefined) updates.invoice_prefix = invoice_prefix.trim() || null;
    if (manager !== undefined) updates.manager = manager.trim() || null;
    if (phone !== undefined) updates.phone = phone.trim() || null;
    if (email !== undefined) updates.email = email.trim() || null;
    if (employeeCodePrefix !== undefined) updates.employee_code_prefix = employeeCodePrefix.trim() || null;
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'status must be active or inactive.' });
      }
      updates.status = status;
    }

    await outlet.update(updates);
    await outlet.reload();
    return res.json(toResponse(outlet));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });
    await outlet.update({ status: outlet.status === 'active' ? 'inactive' : 'active' });
    await outlet.reload();
    return res.json(toResponse(outlet));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });
    await outlet.destroy();
    return res.json({ message: 'Outlet deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, getOne, create, update, toggleStatus, remove, getOutletFinancialSummary };
