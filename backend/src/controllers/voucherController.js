const { CustomerVoucher, Customer, Bill, Outlet, RewardSetting, sequelize } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { sendVoucherWhatsAppNotification } = require('../services/whatsappService');

// Generate unique voucher code e.g. VCH-7X8K2P
const generateVoucherCode = async () => {
  let unique = false;
  let code = '';
  while (!unique) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    code = `VCH-${randomHex}`;
    const existing = await CustomerVoucher.findOne({ where: { code } });
    if (!existing) {
      unique = true;
    }
  }
  return code;
};

// GET /api/vouchers
const getVouchers = async (req, res) => {
  try {
    const { status, search, customer_id } = req.query;

    const where = {};
    if (status && status !== 'all' && status !== 'undefined' && status !== 'null') {
      where.status = status;
    }
    if (customer_id && customer_id !== 'undefined' && customer_id !== 'null') {
      where.customer_id = customer_id;
    }

    if (search && search.trim() && search !== 'undefined' && search !== 'null') {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { code: { [Op.like]: term } },
        { '$customer.name$': { [Op.like]: term } },
        { '$customer.phone$': { [Op.like]: term } },
      ];
    }

    const vouchers = await CustomerVoucher.findAll({
      where,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email'],
        },
        {
          model: Bill,
          as: 'redeemedBill',
          attributes: ['id', 'bill_number', 'subtotal', 'discount_amount', 'voucher_discount_amount', 'total', 'created_at', 'payment_method'],
          include: [{ model: Outlet, attributes: ['id', 'name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Check expiry dynamically
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedVouchers = vouchers.map((v) => {
      const plain = v.toJSON();
      if (plain.status === 'active' && plain.valid_until && plain.valid_until < todayStr) {
        plain.status = 'expired';
      }
      return plain;
    });

    // Calculate metrics
    const stats = {
      total: vouchers.length,
      active: vouchers.filter((v) => v.status === 'active' && (!v.valid_until || v.valid_until >= todayStr)).length,
      inactive: vouchers.filter((v) => v.status === 'inactive').length,
      redeemed: vouchers.filter((v) => v.status === 'redeemed').length,
      expired: vouchers.filter((v) => v.status === 'expired' || (v.status === 'active' && v.valid_until && v.valid_until < todayStr)).length,
    };

    return res.json({
      success: true,
      data: updatedVouchers,
      stats,
    });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch vouchers', error: error.message });
  }
};

// GET /api/vouchers/customer/:customerId
const getCustomerVouchers = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { active_only } = req.query;

    const where = { customer_id: customerId };
    if (active_only === 'true') {
      where.status = 'active';
    }

    const vouchers = await CustomerVoucher.findAll({
      where,
      include: [
        {
          model: Bill,
          as: 'redeemedBill',
          attributes: ['id', 'bill_number', 'total', 'created_at'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const processed = vouchers.map((v) => {
      const item = v.toJSON();
      if (item.status === 'active' && item.valid_until && item.valid_until < todayStr) {
        item.status = 'expired';
      }
      return item;
    });

    return res.json({
      success: true,
      data: processed,
    });
  } catch (error) {
    console.error('Error fetching customer vouchers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer vouchers', error: error.message });
  }
};

// POST /api/vouchers
const issueVoucher = async (req, res) => {
  try {
    const {
      customerId,
      voucherType = 'cash',
      value,
      minSpend = 0,
      validFrom,
      validUntil,
      customCode,
      notes,
      sendWhatsApp = true,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return res.status(400).json({ success: false, message: 'A valid voucher value is required' });
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let code = customCode ? customCode.trim().toUpperCase() : '';
    if (code) {
      const existing = await CustomerVoucher.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Voucher code '${code}' already exists` });
      }
    } else {
      code = await generateVoucherCode();
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const voucher = await CustomerVoucher.create({
      code,
      customer_id: customer.id,
      voucher_type: voucherType,
      initial_value: numValue,
      balance_value: numValue,
      min_spend: parseFloat(minSpend) || 0,
      valid_from: validFrom || todayStr,
      valid_until: validUntil || null,
      status: 'active',
      notes: notes || null,
      issued_by: req.user?.id || req.admin?.id || null,
    });

    let whatsappResult = null;
    if (sendWhatsApp && customer.phone) {
      try {
        whatsappResult = await sendVoucherWhatsAppNotification({
          voucher: voucher.toJSON(),
          customer: customer.toJSON(),
        });
      } catch (waErr) {
        console.warn('[Voucher] WhatsApp dispatch error:', waErr.message);
        whatsappResult = { success: false, error: waErr.message };
      }
    }

    return res.status(201).json({
      success: true,
      message: `Voucher ${voucher.code} issued successfully!`,
      data: {
        ...voucher.toJSON(),
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
        },
        whatsapp: whatsappResult,
      },
    });
  } catch (error) {
    console.error('Error issuing voucher:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue voucher', error: error.message });
  }
};

// POST /api/vouchers/validate
const validateVoucher = async (req, res) => {
  try {
    const { code, customerId, subtotal } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Voucher code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const voucher = await CustomerVoucher.findOne({
      where: { code: cleanCode },
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] }],
    });

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Invalid voucher code.' });
    }

    if (voucher.status !== 'active') {
      return res.status(400).json({ success: false, message: `This voucher is ${voucher.status}.` });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (voucher.valid_from && voucher.valid_from > todayStr) {
      return res.status(400).json({
        success: false,
        message: `Voucher is not active yet (valid from ${voucher.valid_from}).`,
      });
    }

    if (voucher.valid_until && voucher.valid_until < todayStr) {
      // Mark as expired
      await voucher.update({ status: 'expired' });
      return res.status(400).json({ success: false, message: 'This voucher has expired.' });
    }

    // Customer match check (if customer is selected in POS)
    if (customerId && voucher.customer_id && Number(voucher.customer_id) !== Number(customerId)) {
      return res.status(400).json({
        success: false,
        message: `This voucher was issued specifically to ${voucher.customer?.name || 'another customer'}.`,
      });
    }

    const billSubtotal = parseFloat(subtotal || 0);
    if (voucher.min_spend && billSubtotal < parseFloat(voucher.min_spend)) {
      return res.status(400).json({
        success: false,
        message: `Minimum bill spend of ₹${parseFloat(voucher.min_spend).toFixed(2)} is required to use this voucher.`,
      });
    }

    let discountAmount = 0;
    if (voucher.voucher_type === 'percent') {
      discountAmount = (billSubtotal * parseFloat(voucher.initial_value)) / 100;
      if (discountAmount > billSubtotal) discountAmount = billSubtotal;
    } else {
      // Cash / Flat discount voucher
      const availableBalance = parseFloat(voucher.balance_value);
      discountAmount = Math.min(availableBalance, billSubtotal);
    }

    return res.json({
      success: true,
      message: 'Voucher applied successfully',
      data: {
        voucher_id: voucher.id,
        code: voucher.code,
        voucher_type: voucher.voucher_type,
        initial_value: parseFloat(voucher.initial_value),
        balance_value: parseFloat(voucher.balance_value),
        discount_amount: parseFloat(discountAmount.toFixed(2)),
        customer_name: voucher.customer?.name,
        customer_phone: voucher.customer?.phone,
      },
    });
  } catch (error) {
    console.error('Error validating voucher:', error);
    return res.status(500).json({ success: false, message: 'Failed to validate voucher', error: error.message });
  }
};

// POST /api/vouchers/:id/cancel
const cancelVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await CustomerVoucher.findByPk(id);

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    if (voucher.status === 'redeemed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already redeemed voucher' });
    }

    voucher.status = 'cancelled';
    await voucher.save();

    return res.json({ success: true, message: 'Voucher cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling voucher:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel voucher', error: error.message });
  }
};

// POST /api/vouchers/:id/send-whatsapp
const resendWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await CustomerVoucher.findByPk(id, {
      include: [{ model: Customer, as: 'customer' }],
    });

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    if (!voucher.customer || !voucher.customer.phone) {
      return res.status(400).json({ success: false, message: 'Customer phone number is missing' });
    }

    const waResult = await sendVoucherWhatsAppNotification({
      voucher: voucher.toJSON(),
      customer: voucher.customer.toJSON(),
    });

    return res.json({
      success: true,
      message: 'WhatsApp voucher notification sent successfully',
      result: waResult,
    });
  } catch (error) {
    console.error('Error resending WhatsApp voucher notification:', error);
    return res.status(500).json({ success: false, message: 'Failed to send WhatsApp message', error: error.message });
  }
};

// PUT /api/vouchers/:id
const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await CustomerVoucher.findByPk(id, {
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] }],
    });

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    const { value, minSpend, validUntil, validFrom, notes, status } = req.body;

    if (voucher.status === 'redeemed' && value !== undefined && Number(value) !== Number(voucher.initial_value)) {
      return res.status(400).json({ success: false, message: 'Cannot modify value of an already redeemed voucher' });
    }

    if (value !== undefined) {
      const numVal = parseFloat(value);
      if (isNaN(numVal) || numVal <= 0) {
        return res.status(400).json({ success: false, message: 'Valid voucher value is required' });
      }
      if (voucher.status !== 'redeemed') {
        voucher.initial_value = numVal;
        voucher.balance_value = numVal;
      }
    }

    if (minSpend !== undefined) voucher.min_spend = parseFloat(minSpend) || 0;
    if (validUntil !== undefined) voucher.valid_until = validUntil || null;
    if (validFrom !== undefined) voucher.valid_from = validFrom || null;
    if (notes !== undefined) voucher.notes = notes;

    if (status !== undefined) {
      if (voucher.status === 'redeemed' && status !== 'redeemed') {
        return res.status(400).json({ success: false, message: 'Cannot change status of a redeemed voucher' });
      }
      const allowedStatuses = ['active', 'inactive', 'cancelled'];
      if (allowedStatuses.includes(status)) {
        voucher.status = status;
      }
    }

    await voucher.save();

    return res.json({
      success: true,
      message: 'Voucher updated successfully',
      data: voucher,
    });
  } catch (error) {
    console.error('Error updating voucher:', error);
    return res.status(500).json({ success: false, message: 'Failed to update voucher', error: error.message });
  }
};

// DELETE /api/vouchers/:id
const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await CustomerVoucher.findByPk(id);

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    if (voucher.status === 'redeemed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a redeemed voucher as it is linked to billing history.',
      });
    }

    await voucher.destroy();
    return res.json({ success: true, message: 'Voucher deleted successfully' });
  } catch (error) {
    console.error('Error deleting voucher:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete voucher', error: error.message });
  }
};

// GET /api/vouchers/redemptions
const getRedemptionHistory = async (req, res) => {
  try {
    const { search, from_date, to_date, voucher_id } = req.query;

    const where = {
      voucher_id: { [Op.ne]: null },
    };

    if (voucher_id && voucher_id !== 'undefined') {
      where.voucher_id = voucher_id;
    }

    if (from_date && to_date && from_date !== 'undefined' && to_date !== 'undefined') {
      where.created_at = {
        [Op.between]: [new Date(`${from_date}T00:00:00.000Z`), new Date(`${to_date}T23:59:59.999Z`)],
      };
    }

    const bills = await Bill.findAll({
      where,
      include: [
        {
          model: Outlet,
          attributes: ['id', 'name', 'code', 'city'],
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email'],
        },
        {
          model: CustomerVoucher,
          as: 'voucher',
          attributes: ['id', 'code', 'voucher_type', 'initial_value', 'balance_value', 'valid_until', 'notes', 'status'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    let data = bills.map((b) => ({
      bill_id: b.id,
      bill_number: b.bill_number,
      redeemed_at: b.created_at,
      voucher_id: b.voucher_id,
      voucher_code: b.voucher_code || b.voucher?.code,
      voucher_type: b.voucher?.voucher_type || 'cash',
      voucher_initial_value: Number(b.voucher?.initial_value || 0),
      voucher_balance_value: Number(b.voucher?.balance_value || 0),
      discount_amount: Number(b.voucher_discount_amount || b.discount_amount || 0),
      subtotal: Number(b.subtotal || 0),
      tax: Number(b.tax || 0),
      total: Number(b.total || 0),
      payment_method: b.payment_method,
      outlet_id: b.outlet_id,
      outlet_name: b.Outlet?.name || 'Main Branch',
      customer_id: b.customer_id,
      customer_name: b.customer?.name || b.customer_name || 'Walk-in Guest',
      customer_phone: b.customer?.phone || b.customer_phone || '',
      notes: b.voucher?.notes || '',
    }));

    if (search && search.trim() && search !== 'undefined' && search !== 'null') {
      const q = search.trim().toLowerCase();
      data = data.filter((item) =>
        item.voucher_code?.toLowerCase().includes(q) ||
        item.customer_name?.toLowerCase().includes(q) ||
        item.customer_phone?.includes(q) ||
        item.bill_number?.toLowerCase().includes(q) ||
        item.outlet_name?.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      data,
      total_count: data.length,
      total_discount_amount: data.reduce((sum, item) => sum + item.discount_amount, 0),
    });
  } catch (error) {
    console.error('Error fetching redemption history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch redemption history', error: error.message });
  }
};

// Default Auto-Reward Rules configuration
const DEFAULT_VOUCHER_REWARD_RULES = {
  enabled: true,
  min_bill_amount: 100,
  mode: 'tiered', // 'tiered' | 'percentage'
  percentage: 10,
  max_voucher_amount: 500,
  validity_days: 30,
  min_spend_to_redeem: 0,
  tiers: [
    { min_spend: 300, voucher_amount: 30 },
    { min_spend: 500, voucher_amount: 50 },
    { min_spend: 1000, voucher_amount: 100 },
    { min_spend: 2000, voucher_amount: 250 },
  ],
};

const getRulesObject = async () => {
  try {
    const setting = await RewardSetting.findOne({ where: { key: 'voucher_reward_rules' } });
    if (setting && setting.value) {
      return { ...DEFAULT_VOUCHER_REWARD_RULES, ...JSON.parse(setting.value) };
    }
  } catch (e) {
    console.error('Error loading voucher_reward_rules:', e);
  }
  return DEFAULT_VOUCHER_REWARD_RULES;
};

// GET /api/vouchers/reward-rules
const getVoucherRewardRules = async (req, res) => {
  try {
    const rules = await getRulesObject();
    return res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Error fetching voucher reward rules:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch rules', error: error.message });
  }
};

// PUT /api/vouchers/reward-rules
const updateVoucherRewardRules = async (req, res) => {
  try {
    const rules = req.body;
    let setting = await RewardSetting.findOne({ where: { key: 'voucher_reward_rules' } });
    if (!setting) {
      await RewardSetting.create({
        key: 'voucher_reward_rules',
        value: JSON.stringify(rules),
        description: 'Voucher auto-award rules on checkout',
      });
    } else {
      await setting.update({ value: JSON.stringify(rules) });
    }
    return res.json({ success: true, data: rules, message: 'Reward voucher rules updated successfully' });
  } catch (error) {
    console.error('Error updating voucher reward rules:', error);
    return res.status(500).json({ success: false, message: 'Failed to update rules', error: error.message });
  }
};

// Evaluate reward eligibility for a bill total
const evaluateBillVoucherReward = async (billAmount) => {
  const rules = await getRulesObject();
  if (!rules || !rules.enabled) return null;
  const amt = Number(billAmount) || 0;
  if (amt < (Number(rules.min_bill_amount) || 0)) return null;

  let voucher_amount = 0;
  if (rules.mode === 'percentage') {
    const pct = Number(rules.percentage) || 0;
    voucher_amount = Math.round((amt * pct) / 100);
    const maxCap = Number(rules.max_voucher_amount) || 0;
    if (maxCap > 0 && voucher_amount > maxCap) {
      voucher_amount = maxCap;
    }
  } else {
    // tiered
    const tiers = Array.isArray(rules.tiers) ? [...rules.tiers] : [];
    tiers.sort((a, b) => Number(b.min_spend) - Number(a.min_spend));
    const matched = tiers.find(t => amt >= Number(t.min_spend));
    if (matched) {
      voucher_amount = Number(matched.voucher_amount) || 0;
    }
  }

  if (voucher_amount <= 0) return null;

  const validity_days = Number(rules.validity_days) || 30;
  const expiry_date = new Date(Date.now() + validity_days * 24 * 60 * 60 * 1000);
  return {
    voucher_amount,
    validity_days,
    expiry_date,
    min_spend_to_redeem: Number(rules.min_spend_to_redeem) || 0,
  };
};

// Helper: auto-generate and award voucher during checkout
const awardBillVoucher = async ({ bill, customer, userId, transaction }) => {
  const billTotal = Number(bill.total) || 0;
  if (billTotal <= 0) return null;

  const evalResult = await evaluateBillVoucherReward(billTotal);
  if (!evalResult || !evalResult.voucher_amount) return null;

  const code = await generateVoucherCode();
  const todayStr = new Date().toISOString().split('T')[0];
  const validUntilStr = evalResult.expiry_date.toISOString().split('T')[0];

  const voucher = await CustomerVoucher.create(
    {
      code,
      customer_id: customer?.id || bill.customer_id || null,
      voucher_type: 'cash',
      initial_value: evalResult.voucher_amount,
      balance_value: evalResult.voucher_amount,
      min_spend: evalResult.min_spend_to_redeem || 0,
      valid_from: todayStr,
      valid_until: validUntilStr,
      status: 'active',
      notes: `Auto-awarded from Bill #${bill.bill_number} (Spend: ${billTotal.toFixed(2)})`,
      issued_by: userId || null,
      issued_from_bill_id: bill.id,
    },
    transaction ? { transaction } : {}
  );

  bill.awarded_voucher_id = voucher.id;
  bill.awarded_voucher_code = voucher.code;
  bill.awarded_voucher_amount = evalResult.voucher_amount;
  await bill.save(transaction ? { transaction } : {});

  return voucher;
};

module.exports = {
  getVouchers,
  getCustomerVouchers,
  getRedemptionHistory,
  issueVoucher,
  validateVoucher,
  updateVoucher,
  deleteVoucher,
  cancelVoucher,
  resendWhatsApp,
  getVoucherRewardRules,
  updateVoucherRewardRules,
  evaluateBillVoucherReward,
  awardBillVoucher,
};
