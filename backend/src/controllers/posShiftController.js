const { PosTerminal, PosShift, PosShiftMovement, Bill, Admin, Outlet, Payment, PaymentDetail, sequelize } = require('../models');
const { Op } = require('sequelize');

// Self-healing DB Migration helper: ensures tables and bill columns exist in MySQL immediately
(async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('pos_terminals')) {
      const PosTerminal = require('../models/PosTerminal');
      await PosTerminal.sync({ force: true });
    }
    if (!tables.includes('pos_shifts')) {
      const PosShift = require('../models/PosShift');
      await PosShift.sync({ force: true });
    }
    if (!tables.includes('pos_shift_movements')) {
      const PosShiftMovement = require('../models/PosShiftMovement');
      await PosShiftMovement.sync({ force: true });
    }
    const [columns] = await sequelize.query("SHOW COLUMNS FROM bills");
    const colNames = columns.map(c => c.Field);
    if (!colNames.includes('pos_terminal_id')) {
      await sequelize.query("ALTER TABLE bills ADD COLUMN `pos_terminal_id` INT UNSIGNED NULL");
    }
    if (!colNames.includes('pos_shift_id')) {
      await sequelize.query("ALTER TABLE bills ADD COLUMN `pos_shift_id` INT UNSIGNED NULL");
    }
  } catch (err) {
    console.error('POS Shift Auto-migration Notice:', err.message);
  }
})();

// --- TERMINALS ---

exports.getTerminals = async (req, res) => {
  try {
    const outlet_id = req.query.outlet_id || req.user?.outlet_id;
    const where = {};
    if (outlet_id) where.outlet_id = outlet_id;

    const terminals = await PosTerminal.findAll({
      where,
      include: [
        { model: Outlet, as: 'outlet', attributes: ['id', 'name'] },
        {
          model: PosShift,
          as: 'shifts',
          where: { status: 'OPEN' },
          required: false,
          include: [{ model: Admin, as: 'user', attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['id', 'ASC']],
    });

    res.json({ success: true, terminals });
  } catch (error) {
    console.error('Error fetching POS terminals:', error);
    res.status(500).json({ success: false, message: 'Server error fetching terminals', error: error.message });
  }
};

exports.createTerminal = async (req, res) => {
  try {
    const user = req.user || req.admin;
    if (user?.role === 'cashier' || user?.role === 'pos') {
      return res.status(403).json({ success: false, message: 'Forbidden. Cashiers are not allowed to manage terminals.' });
    }

    const { outlet_id, name, code } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Terminal name is required' });
    }

    const targetOutletId = outlet_id || req.user?.outlet_id;
    if (!targetOutletId) {
      return res.status(400).json({ success: false, message: 'Outlet ID is required' });
    }

    const terminal = await PosTerminal.create({
      outlet_id: targetOutletId,
      name,
      code: code || `TERM-${Date.now().toString().slice(-4)}`,
      is_active: true,
    });

    res.status(201).json({ success: true, terminal });
  } catch (error) {
    console.error('Error creating terminal:', error);
    res.status(500).json({ success: false, message: 'Server error creating terminal', error: error.message });
  }
};

exports.updateTerminal = async (req, res) => {
  try {
    const user = req.user || req.admin;
    if (user?.role === 'cashier' || user?.role === 'pos') {
      return res.status(403).json({ success: false, message: 'Forbidden. Cashiers are not allowed to manage terminals.' });
    }

    const { id } = req.params;
    const { name, code, is_active } = req.body;

    const terminal = await PosTerminal.findByPk(id);
    if (!terminal) {
      return res.status(404).json({ success: false, message: 'Terminal not found' });
    }

    if (name !== undefined) terminal.name = name;
    if (code !== undefined) terminal.code = code;
    if (is_active !== undefined) terminal.is_active = is_active;

    await terminal.save();
    res.json({ success: true, terminal });
  } catch (error) {
    console.error('Error updating terminal:', error);
    res.status(500).json({ success: false, message: 'Server error updating terminal', error: error.message });
  }
};

exports.deleteTerminal = async (req, res) => {
  try {
    const user = req.user || req.admin;
    if (user?.role === 'cashier' || user?.role === 'pos') {
      return res.status(403).json({ success: false, message: 'Forbidden. Cashiers are not allowed to manage terminals.' });
    }

    const { id } = req.params;
    const terminal = await PosTerminal.findByPk(id);
    if (!terminal) {
      return res.status(404).json({ success: false, message: 'Terminal not found' });
    }

    // Check if terminal has active shift
    const activeShift = await PosShift.findOne({ where: { pos_terminal_id: id, status: 'OPEN' } });
    if (activeShift) {
      return res.status(400).json({ success: false, message: 'Cannot delete a terminal with an active shift' });
    }

    terminal.is_active = false;
    await terminal.save();

    res.json({ success: true, message: 'Terminal deactivated successfully' });
  } catch (error) {
    console.error('Error deleting terminal:', error);
    res.status(500).json({ success: false, message: 'Server error deleting terminal', error: error.message });
  }
};

// --- SHIFTS ---

exports.getActiveShift = async (req, res) => {
  try {
    const { terminal_id } = req.query;
    if (!terminal_id) {
      return res.status(400).json({ success: false, message: 'terminal_id is required' });
    }

    const shift = await PosShift.findOne({
      where: { pos_terminal_id: terminal_id, status: 'OPEN' },
      include: [
        { model: PosTerminal, as: 'terminal' },
        { model: Admin, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: PosShiftMovement, as: 'movements' },
      ],
    });

    res.json({ success: true, shift });
  } catch (error) {
    console.error('Error fetching active shift:', error);
    res.status(500).json({ success: false, message: 'Server error fetching active shift', error: error.message });
  }
};

exports.openShift = async (req, res) => {
  try {
    const { pos_terminal_id, outlet_id, opening_cash, opening_notes } = req.body;
    const user_id = req.user.id;

    if (!pos_terminal_id) {
      return res.status(400).json({ success: false, message: 'pos_terminal_id is required' });
    }

    const terminal = await PosTerminal.findByPk(pos_terminal_id);
    if (!terminal || !terminal.is_active) {
      return res.status(404).json({ success: false, message: 'Terminal not found or inactive' });
    }

    // Check if an open shift already exists for this terminal
    const existingShift = await PosShift.findOne({
      where: { pos_terminal_id, status: 'OPEN' },
      include: [{ model: Admin, as: 'user', attributes: ['id', 'name'] }],
    });

    if (existingShift) {
      return res.status(400).json({
        success: false,
        message: `Terminal "${terminal.name}" already has an open shift owned by ${existingShift.user?.name || 'another cashier'}.`,
        shift: existingShift,
      });
    }

    const shift = await PosShift.create({
      pos_terminal_id,
      outlet_id: outlet_id || terminal.outlet_id,
      user_id,
      opening_cash: parseFloat(opening_cash) || 0.0,
      opening_notes: opening_notes || null,
      status: 'OPEN',
      opened_at: new Date(),
    });

    const fullShift = await PosShift.findByPk(shift.id, {
      include: [
        { model: PosTerminal, as: 'terminal' },
        { model: Admin, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: PosShiftMovement, as: 'movements' },
      ],
    });

    res.status(201).json({ success: true, message: 'Shift opened successfully', shift: fullShift });
  } catch (error) {
    console.error('Error opening shift:', error);
    res.status(500).json({ success: false, message: 'Server error opening shift', error: error.message });
  }
};

exports.updateActiveShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { opening_cash, opening_notes } = req.body;

    const shift = await PosShift.findByPk(id);
    if (!shift || shift.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'Active open shift not found' });
    }

    if (opening_cash !== undefined) {
      const num = parseFloat(opening_cash);
      if (!isNaN(num) && num >= 0) {
        shift.opening_cash = num;
      }
    }
    if (opening_notes !== undefined) {
      shift.opening_notes = opening_notes;
    }

    await shift.save();

    const fullShift = await PosShift.findByPk(shift.id, {
      include: [
        { model: PosTerminal, as: 'terminal' },
        { model: Admin, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: PosShiftMovement, as: 'movements' },
      ],
    });

    res.json({ success: true, message: 'Shift updated successfully', shift: fullShift });
  } catch (error) {
    console.error('Error updating active shift:', error);
    res.status(500).json({ success: false, message: 'Server error updating active shift', error: error.message });
  }
};

exports.addCashMovement = async (req, res) => {
  try {
    const { id } = req.params; // shift_id
    const { type, amount, reason } = req.body;
    const user_id = req.user.id;

    if (!['CASH_IN', 'CASH_OUT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid movement type. Must be CASH_IN or CASH_OUT' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount greater than 0 is required' });
    }

    const shift = await PosShift.findByPk(id);
    if (!shift || shift.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'Shift not found or is closed' });
    }

    const movement = await PosShiftMovement.create({
      pos_shift_id: shift.id,
      user_id,
      type,
      amount: numAmount,
      reason: reason || '',
    });

    res.status(201).json({ success: true, message: 'Cash movement recorded', movement });
  } catch (error) {
    console.error('Error adding cash movement:', error);
    res.status(500).json({ success: false, message: 'Server error adding cash movement', error: error.message });
  }
};

// Internal Helper to calculate shift financial metrics
const computeShiftMetrics = async (shiftId) => {
  const shift = await PosShift.findByPk(shiftId, {
    include: [
      { model: PosTerminal, as: 'terminal' },
      { model: Admin, as: 'user', attributes: ['id', 'name', 'email'] },
      { model: PosShiftMovement, as: 'movements' },
    ],
  });

  if (!shift) return null;

  // Fetch all completed bills associated with this shift
  const bills = await Bill.findAll({
    where: {
      pos_shift_id: shiftId,
      status: { [Op.ne]: 'cancelled' },
    },
    include: [
      {
        model: Payment,
        as: 'payments',
        include: [{ model: PaymentDetail, as: 'details' }],
      },
    ],
  });

  let cashSales = 0;
  let cardSales = 0;
  let upiSales = 0;
  let creditSales = 0;
  let otherSales = 0;
  let totalSales = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  bills.forEach((bill) => {
    const total = parseFloat(bill.total || 0);
    const discount = parseFloat(bill.discount_amount || 0);
    const tax = parseFloat(bill.tax || 0);

    totalSales += total;
    totalDiscount += discount;
    totalTax += tax;

    let hasDetailPayments = false;
    (bill.payments || []).forEach((p) => {
      (p.details || []).forEach((d) => {
        hasDetailPayments = true;
        const amt = parseFloat(d.amount || 0);
        const mode = (d.payment_mode || '').toLowerCase();
        if (mode === 'cash') cashSales += amt;
        else if (mode === 'card') cardSales += amt;
        else if (mode === 'upi') upiSales += amt;
        else if (mode === 'store_credit' || mode.includes('credit')) creditSales += amt;
        else otherSales += amt;
      });
    });

    if (!hasDetailPayments) {
      const method = (bill.payment_method || '').toLowerCase();
      if (method.includes('cash')) cashSales += total;
      else if (method.includes('card')) cardSales += total;
      else if (method.includes('upi')) upiSales += total;
      else if (method.includes('credit')) creditSales += total;
      else otherSales += total;
    }
  });

  let totalCashIn = 0;
  let totalCashOut = 0;

  (shift.movements || []).forEach((m) => {
    const amt = parseFloat(m.amount || 0);
    if (m.type === 'CASH_IN') totalCashIn += amt;
    if (m.type === 'CASH_OUT') totalCashOut += amt;
  });

  const openingCash = parseFloat(shift.opening_cash || 0);
  const expectedCash = openingCash + cashSales + totalCashIn - totalCashOut;

  return {
    shift,
    billsCount: bills.length,
    openingCash,
    cashSales,
    cardSales,
    upiSales,
    creditSales,
    otherSales,
    totalSales,
    totalDiscount,
    totalTax,
    totalCashIn,
    totalCashOut,
    expectedCash,
  };
};

exports.getXReport = async (req, res) => {
  try {
    const { id } = req.params; // shift_id
    const metrics = await computeShiftMetrics(id);

    if (!metrics) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    res.json({ success: true, report: metrics });
  } catch (error) {
    console.error('Error generating X-Report:', error);
    res.status(500).json({ success: false, message: 'Server error generating X-Report', error: error.message });
  }
};

exports.closeShift = async (req, res) => {
  try {
    const { id } = req.params; // shift_id
    const { actual_closing_cash, closing_notes } = req.body;

    const numActualCash = parseFloat(actual_closing_cash);
    if (isNaN(numActualCash) || numActualCash < 0) {
      return res.status(400).json({ success: false, message: 'Valid actual closing cash amount is required' });
    }

    const metrics = await computeShiftMetrics(id);
    if (!metrics) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const shift = metrics.shift;
    if (shift.status === 'CLOSED') {
      return res.status(400).json({ success: false, message: 'Shift is already closed' });
    }

    const expectedClosingCash = metrics.expectedCash;
    const variance = numActualCash - expectedClosingCash;

    shift.status = 'CLOSED';
    shift.closed_at = new Date();
    shift.expected_closing_cash = expectedClosingCash;
    shift.actual_closing_cash = numActualCash;
    shift.variance = variance;
    shift.closing_notes = closing_notes || null;

    await shift.save();

    const updatedMetrics = await computeShiftMetrics(id);

    res.json({
      success: true,
      message: 'Shift closed successfully',
      report: updatedMetrics,
    });
  } catch (error) {
    console.error('Error closing shift:', error);
    res.status(500).json({ success: false, message: 'Server error closing shift', error: error.message });
  }
};

exports.getShiftHistory = async (req, res) => {
  try {
    const { outlet_id, terminal_id, user_id, status, startDate, endDate } = req.query;

    const where = {};
    if (outlet_id) where.outlet_id = outlet_id;
    if (terminal_id) where.pos_terminal_id = terminal_id;
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.opened_at = {};
      if (startDate) where.opened_at[Op.gte] = new Date(startDate);
      if (endDate) where.opened_at[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }

    const shifts = await PosShift.findAll({
      where,
      include: [
        { model: PosTerminal, as: 'terminal', attributes: ['id', 'name', 'code'] },
        { model: Admin, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Outlet, as: 'outlet', attributes: ['id', 'name'] },
        { model: PosShiftMovement, as: 'movements' },
      ],
      order: [['opened_at', 'DESC']],
    });

    res.json({ success: true, shifts });
  } catch (error) {
    console.error('Error fetching shift history:', error);
    res.status(500).json({ success: false, message: 'Server error fetching shift history', error: error.message });
  }
};
