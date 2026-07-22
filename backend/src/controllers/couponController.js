const { Coupon, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all coupons
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch coupons', error: error.message });
  }
};

// Create a new coupon
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discount_type,
      discount_value,
      min_spend,
      max_discount_amount,
      valid_from,
      valid_until,
      usage_limit,
      is_active,
    } = req.body;

    if (!code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ success: false, message: 'Code, discount type, and discount value are required.' });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists.' });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      title,
      description,
      discount_type,
      discount_value,
      min_spend: min_spend || 0,
      max_discount_amount: max_discount_amount || null,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
      usage_limit: usage_limit || null,
      is_active: is_active !== undefined ? is_active : true,
    });

    return res.status(201).json({ success: true, message: 'Coupon created successfully', data: coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return res.status(500).json({ success: false, message: 'Failed to create coupon', error: error.message });
  }
};

// Update coupon
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const {
      code,
      title,
      description,
      discount_type,
      discount_value,
      min_spend,
      max_discount_amount,
      valid_from,
      valid_until,
      usage_limit,
      is_active,
    } = req.body;

    if (code && code.trim().toUpperCase() !== coupon.code) {
      const existing = await Coupon.findOne({ where: { code: code.trim().toUpperCase() } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists.' });
      }
      coupon.code = code.trim().toUpperCase();
    }

    if (title !== undefined) coupon.title = title;
    if (description !== undefined) coupon.description = description;
    if (discount_type !== undefined) coupon.discount_type = discount_type;
    if (discount_value !== undefined) coupon.discount_value = discount_value;
    if (min_spend !== undefined) coupon.min_spend = min_spend;
    if (max_discount_amount !== undefined) coupon.max_discount_amount = max_discount_amount;
    if (valid_from !== undefined) coupon.valid_from = valid_from || null;
    if (valid_until !== undefined) coupon.valid_until = valid_until || null;
    if (usage_limit !== undefined) coupon.usage_limit = usage_limit || null;
    if (is_active !== undefined) coupon.is_active = is_active;

    await coupon.save();

    return res.json({ success: true, message: 'Coupon updated successfully', data: coupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return res.status(500).json({ success: false, message: 'Failed to update coupon', error: error.message });
  }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    await coupon.destroy();
    return res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete coupon', error: error.message });
  }
};

// Validate coupon for POS/Billing
const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ where: { code: cleanCode } });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    if (!coupon.is_active) {
      return res.status(400).json({ success: false, message: 'This coupon is inactive' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (coupon.valid_from && coupon.valid_from > todayStr) {
      return res.status(400).json({ success: false, message: `Coupon is not valid yet (valid from ${coupon.valid_from})` });
    }

    if (coupon.valid_until && coupon.valid_until < todayStr) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }

    const billSubtotal = parseFloat(subtotal || 0);
    if (coupon.min_spend && billSubtotal < parseFloat(coupon.min_spend)) {
      return res.status(400).json({
        success: false,
        message: `Minimum spend of ₹${coupon.min_spend} required for this coupon`,
      });
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percent') {
      discountAmount = (billSubtotal * parseFloat(coupon.discount_value)) / 100;
      if (coupon.max_discount_amount && discountAmount > parseFloat(coupon.max_discount_amount)) {
        discountAmount = parseFloat(coupon.max_discount_amount);
      }
    } else {
      discountAmount = parseFloat(coupon.discount_value);
      if (discountAmount > billSubtotal) {
        discountAmount = billSubtotal;
      }
    }

    return res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        coupon_id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: parseFloat(discountAmount.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return res.status(500).json({ success: false, message: 'Failed to validate coupon', error: error.message });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};
