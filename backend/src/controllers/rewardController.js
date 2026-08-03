const { RewardSetting, LoyaltyTier, LoyaltyLedger, Customer, Bill } = require('../models');
const rewardService = require('../services/rewardService');

// GET /api/rewards/settings
const getSettings = async (req, res) => {
  try {
    const settings = await rewardService.getRewardSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching reward settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/rewards/settings
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings format' });
    }

    for (const [key, value] of Object.entries(settings)) {
      let record = await RewardSetting.findOne({ where: { key } });
      if (record) {
        record.value = String(value);
        await record.save();
      } else {
        await RewardSetting.create({ key, value: String(value) });
      }
    }

    const updated = await rewardService.getRewardSettings();
    res.json({ success: true, settings: updated, message: 'Reward settings updated successfully' });
  } catch (err) {
    console.error('Error updating reward settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rewards/tiers
const getTiers = async (req, res) => {
  try {
    await rewardService.getRewardSettings(); // ensures defaults seeded if empty
    const tiers = await LoyaltyTier.findAll({
      order: [['min_spend', 'ASC']],
    });
    res.json({ success: true, tiers });
  } catch (err) {
    console.error('Error fetching loyalty tiers:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/rewards/tiers
const createTier = async (req, res) => {
  try {
    const { name, min_spend, multiplier, badge_color, icon, status } = req.body;
    if (!name || min_spend === undefined || multiplier === undefined) {
      return res.status(400).json({ success: false, message: 'Name, min_spend, and multiplier are required' });
    }

    const tier = await LoyaltyTier.create({
      name,
      min_spend: parseFloat(min_spend),
      multiplier: parseFloat(multiplier),
      badge_color: badge_color || '#cd7f32',
      icon: icon || 'Award',
      status: status || 'active',
    });

    res.status(201).json({ success: true, tier, message: 'Loyalty Tier created successfully' });
  } catch (err) {
    console.error('Error creating loyalty tier:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/rewards/tiers/:id
const updateTier = async (req, res) => {
  try {
    const { id } = req.params;
    const tier = await LoyaltyTier.findByPk(id);
    if (!tier) {
      return res.status(404).json({ success: false, message: 'Loyalty tier not found' });
    }

    const { name, min_spend, multiplier, badge_color, icon, status } = req.body;
    if (name !== undefined) tier.name = name;
    if (min_spend !== undefined) tier.min_spend = parseFloat(min_spend);
    if (multiplier !== undefined) tier.multiplier = parseFloat(multiplier);
    if (badge_color !== undefined) tier.badge_color = badge_color;
    if (icon !== undefined) tier.icon = icon;
    if (status !== undefined) tier.status = status;

    await tier.save();
    res.json({ success: true, tier, message: 'Loyalty tier updated successfully' });
  } catch (err) {
    console.error('Error updating loyalty tier:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/rewards/tiers/:id
const deleteTier = async (req, res) => {
  try {
    const { id } = req.params;
    const tier = await LoyaltyTier.findByPk(id);
    if (!tier) {
      return res.status(404).json({ success: false, message: 'Loyalty tier not found' });
    }

    await tier.destroy();
    res.json({ success: true, message: 'Loyalty tier deleted successfully' });
  } catch (err) {
    console.error('Error deleting loyalty tier:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rewards/customers/:customerId/history
const getCustomerPointsHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findByPk(customerId, {
      include: [{ model: LoyaltyTier, as: 'loyaltyTier' }],
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const ledgers = await LoyaltyLedger.findAll({
      where: { customer_id: customerId },
      include: [
        { model: Bill, as: 'bill', attributes: ['id', 'bill_number', 'total', 'created_at'] },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        loyalty_points: customer.loyalty_points,
        total_spend: customer.total_spend,
        loyaltyTier: customer.loyaltyTier,
      },
      history: ledgers,
    });
  } catch (err) {
    console.error('Error fetching customer points history:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/rewards/customers/:customerId/adjust
const adjustCustomerPointsHandler = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { points, notes } = req.body;
    const adminUser = req.user ? (req.user.name || req.user.username) : 'Admin';

    const result = await rewardService.adjustCustomerPoints({
      customerId,
      points,
      notes,
      createdBy: adminUser,
    });

    res.json({
      success: true,
      message: 'Customer points updated successfully',
      customer: result.customer,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    console.error('Error adjusting customer points:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getTiers,
  createTier,
  updateTier,
  deleteTier,
  getCustomerPointsHistory,
  adjustCustomerPointsHandler,
};
