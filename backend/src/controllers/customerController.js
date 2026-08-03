const { Customer, Bill, Appointment, CustomerLedger, LoyaltyTier, sequelize } = require('../models');
const { Op } = require('sequelize');

// GET /api/customers
const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      include: [{ model: LoyaltyTier, as: 'loyaltyTier' }],
      limit: parseInt(limit, 10),
      offset,
      order: [['updatedAt', 'DESC']],
    });

    return res.json({
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      customers: rows,
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ message: 'Server error fetching customers.' });
  }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [
        { model: LoyaltyTier, as: 'loyaltyTier' },
        { model: Bill },
        { model: Appointment },
      ],
      order: [
        [Bill, 'createdAt', 'DESC'],
        [Appointment, 'appointment_date', 'DESC'],
      ],
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    return res.json(customer);
  } catch (err) {
    console.error('Error fetching customer details:', err);
    return res.status(500).json({ message: 'Server error fetching customer.' });
  }
};

// POST /api/customers
const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, gender, dob, anniversary, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required.' });
    }

    // Check existing phone
    let customer = await Customer.findOne({ where: { phone } });
    if (customer) {
      return res.status(400).json({ message: 'Customer with this phone already exists.' });
    }

    const sanitizeDate = (val) => {
      if (!val || val === '' || val === 'Invalid date') return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : val;
    };

    customer = await Customer.create({
      name,
      phone,
      email: email || null,
      gender: gender || null,
      dob: sanitizeDate(dob),
      anniversary: sanitizeDate(anniversary),
      notes: notes || null,
    });

    return res.status(201).json(customer);
  } catch (err) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ message: 'Server error creating customer.' });
  }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const { name, phone, email, gender, dob, anniversary, notes, status } = req.body;

    if (phone && phone !== customer.phone) {
      const existing = await Customer.findOne({ where: { phone } });
      if (existing) {
        return res.status(400).json({ message: 'Phone number already in use by another customer.' });
      }
    }

    const sanitizeDate = (val) => {
      if (!val || val === '' || val === 'Invalid date') return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : val;
    };

    await customer.update({
      name: name !== undefined ? name : customer.name,
      phone: phone !== undefined ? phone : customer.phone,
      email: email !== undefined ? email : customer.email,
      gender: gender !== undefined ? gender : customer.gender,
      dob: dob !== undefined ? sanitizeDate(dob) : customer.dob,
      anniversary: anniversary !== undefined ? sanitizeDate(anniversary) : customer.anniversary,
      notes: notes !== undefined ? notes : customer.notes,
      status: status !== undefined ? status : customer.status,
    });

    return res.json(customer);
  } catch (err) {
    console.error('Error updating customer:', err);
    return res.status(500).json({ message: 'Server error updating customer.' });
  }
};

// DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    await customer.destroy();
    return res.json({ message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    return res.status(500).json({ message: 'Server error deleting customer.' });
  }
};

// GET /api/customers/:id/ledger
const getCustomerLedger = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const ledgers = await CustomerLedger.findAll({
      where: { customer_id: customerId },
      include: [
        { model: Bill, as: 'bill', attributes: ['id', 'bill_number', 'total', 'payment_method', 'status', 'createdAt'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Build bill lookup criteria for this customer
    const billWhere = {};
    if (customer.phone) {
      billWhere[Op.or] = [
        { customer_id: customerId },
        { customer_phone: customer.phone },
      ];
    } else {
      billWhere.customer_id = customerId;
    }

    const { Payment, PaymentDetail } = require('../models');
    const customerBills = await Bill.findAll({
      where: billWhere,
      include: [
        {
          model: Payment,
          as: 'payments',
          include: [{ model: PaymentDetail, as: 'details' }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const pendingBillsMap = {};

    // Process all bills linked to customer
    customerBills.forEach((b) => {
      let paidFromDetails = 0;
      (b.payments || []).forEach((p) => {
        (p.details || []).forEach((d) => {
          paidFromDetails += Number(d.amount || 0);
        });
      });

      let paidFromLedgers = 0;
      ledgers.forEach((l) => {
        if (l.bill_id === b.id && (l.type === 'settlement' || l.type === 'bill_payment')) {
          paidFromLedgers += Number(l.amount || 0);
        }
      });

      const totalPaid = Math.max(paidFromDetails, paidFromLedgers);
      const billTotal = Number(b.total || 0);
      const remainingDue = billTotal - totalPaid;

      if (remainingDue > 0.01 || b.status === 'unpaid' || b.status === 'partially_paid' || b.payment_method === 'Unpaid') {
        pendingBillsMap[b.id] = {
          id: b.id,
          billNumber: b.bill_number,
          total: billTotal,
          totalPaid,
          remainingDue: Math.max(0, remainingDue),
          status: b.status,
          paymentMethod: b.payment_method,
          createdAt: b.createdAt,
        };
      }
    });

    // Process ledgers linked to bills that might not have customer_id on Bill table
    ledgers.forEach((item) => {
      if (item.bill_id && item.bill && !pendingBillsMap[item.bill_id]) {
        const bId = item.bill_id;
        const bTotal = Number(item.bill.total || 0);
        let paid = 0;
        ledgers.forEach((l) => {
          if (l.bill_id === bId && (l.type === 'settlement' || l.type === 'bill_payment')) {
            paid += Number(l.amount || 0);
          }
        });
        const rem = bTotal - paid;
        if (rem > 0.01 || item.bill.status === 'unpaid' || item.bill.status === 'partially_paid') {
          pendingBillsMap[bId] = {
            id: item.bill.id,
            billNumber: item.bill.bill_number,
            total: bTotal,
            totalPaid: paid,
            remainingDue: Math.max(0, rem),
            status: item.bill.status,
            paymentMethod: item.bill.payment_method,
            createdAt: item.bill.createdAt,
          };
        }
      }
    });

    const pendingBills = Object.values(pendingBillsMap).filter((b) => b.remainingDue > 0);

    return res.json({
      customer,
      ledgers,
      pendingBills,
    });
  } catch (err) {
    console.error('Error fetching customer ledger:', err);
    return res.status(500).json({ message: 'Server error fetching customer ledger.' });
  }
};

// POST /api/customers/:id/settle
const settleCustomerBalance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const customerId = req.params.id;
    const { type, amount, payment_method, notes, bill_id } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'A valid positive amount is required.' });
    }

    const customer = await Customer.findByPk(customerId, { transaction: t, lock: true });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ message: 'Customer not found.' });
    }

    let currentBalance = parseFloat(customer.credit_balance || 0);
    let newBalance = currentBalance;

    if (type === 'deposit' || type === 'settlement') {
      newBalance = currentBalance + numAmount;
    } else if (type === 'due_charge') {
      newBalance = currentBalance - numAmount;
    } else if (type === 'adjustment') {
      // Amount can be positive or negative for adjustments
      newBalance = currentBalance + numAmount;
    } else {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid settlement transaction type.' });
    }

    await customer.update({ credit_balance: newBalance }, { transaction: t });

    // If settling a specific bill, update the Bill and add Payment / PaymentDetail records
    if (bill_id) {
      const { Payment, PaymentDetail } = require('../models');
      const targetBill = await Bill.findByPk(bill_id, {
        include: [
          { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
        ],
        transaction: t,
      });

      if (targetBill) {
        let existingPaid = 0;
        (targetBill.payments || []).forEach((p) => {
          (p.details || []).forEach((d) => {
            existingPaid += Number(d.amount || 0);
          });
        });
        const newTotalPaid = existingPaid + numAmount;
        const billTotal = Number(targetBill.total || 0);
        const newStatus = newTotalPaid >= billTotal ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : 'unpaid');
        const modeMap = { cash: 'cash', card: 'card', upi: 'upi', bank: 'bank_transfer', 'store credit': 'store_credit' };
        const modeVal = modeMap[(payment_method || '').toLowerCase()] || 'cash';

        const paymentRecord = await Payment.create(
          {
            bill_id: targetBill.id,
            total_amount: numAmount,
            status: 'completed',
            payment_date: new Date().toISOString().split('T')[0],
            notes: notes || 'Settled via Customer CRM',
          },
          { transaction: t }
        );

        await PaymentDetail.create(
          {
            payment_id: paymentRecord.id,
            payment_mode: modeVal,
            amount: numAmount,
          },
          { transaction: t }
        );

        const updatedPaymentMethod = targetBill.payment_method === 'Unpaid' ? (payment_method || 'Cash') : targetBill.payment_method;
        await targetBill.update(
          {
            status: newStatus,
            payment_method: updatedPaymentMethod,
          },
          { transaction: t }
        );
      }
    }

    const validPaymentMethods = {
      cash: 'Cash',
      card: 'Card',
      upi: 'UPI',
      bank: 'Bank',
      'store credit': 'Store Credit',
      'store_credit': 'Store Credit',
      adjustment: 'Adjustment',
    };
    const normalizedMethod = validPaymentMethods[(payment_method || '').toLowerCase()] || payment_method || 'Cash';

    const ledger = await CustomerLedger.create({
      customer_id: customerId,
      bill_id: bill_id || null,
      type: type || 'settlement',
      amount: numAmount,
      balance_after: newBalance,
      payment_method: normalizedMethod,
      notes: notes || null,
      created_by: req.user ? req.user.name || req.user.username : 'System',
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      message: 'Transaction recorded successfully.',
      customer,
      ledger,
    });
  } catch (err) {
    await t.rollback();
    console.error('Error recording customer settlement:', err);
    return res.status(500).json({ message: 'Server error recording customer transaction.' });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  settleCustomerBalance,
};

