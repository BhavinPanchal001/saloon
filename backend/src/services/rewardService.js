const { RewardSetting, LoyaltyTier, LoyaltyLedger, Customer, sequelize } = require('../models');

// Default fallback values
const DEFAULT_SETTINGS = {
  earn_spend_per_point: '100',       // ₹100 spend = 1 base point
  point_monetary_value: '1',         // 1 point = ₹1 discount
  min_points_to_redeem: '10',        // Minimum 10 points to redeem
  max_redeem_percentage: '50',       // Max 50% of bill subtotal can be paid via points
  enable_whatsapp_notifications: 'true',
};

// Default Tiers to seed if database table is empty
const DEFAULT_TIERS = [
  { name: 'Bronze', min_spend: 0, multiplier: 1.0, badge_color: '#92400e', icon: 'Award' },
  { name: 'Silver', min_spend: 5000, multiplier: 1.25, badge_color: '#475569', icon: 'ShieldCheck' },
  { name: 'Gold', min_spend: 20000, multiplier: 1.5, badge_color: '#b45309', icon: 'Crown' },
  { name: 'Platinum', min_spend: 50000, multiplier: 2.0, badge_color: '#4c1d95', icon: 'Zap' },
];

/**
 * Ensures default settings and tiers exist in DB
 */
const initializeRewardDefaults = async () => {
  try {
    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await RewardSetting.findOne({ where: { key } });
      if (!existing) {
        await RewardSetting.create({ key, value: val, description: `Default setting for ${key}` });
      }
    }

    const tierCount = await LoyaltyTier.count();
    if (tierCount === 0) {
      for (const tier of DEFAULT_TIERS) {
        await LoyaltyTier.create(tier);
      }
    }
  } catch (err) {
    console.error('Failed to initialize reward defaults:', err.message);
  }
};

/**
 * Fetch all reward settings as a key-value object
 */
const getRewardSettings = async () => {
  await initializeRewardDefaults();
  const settingsRecords = await RewardSetting.findAll();
  const settings = { ...DEFAULT_SETTINGS };
  settingsRecords.forEach(s => {
    settings[s.key] = s.value;
  });
  return settings;
};

/**
 * Evaluate customer tier based on total spend
 */
const evaluateCustomerTier = async (customer, transaction = null) => {
  const tiers = await LoyaltyTier.findAll({
    where: { status: 'active' },
    order: [['min_spend', 'DESC']],
    transaction,
  });

  const totalSpend = parseFloat(customer.total_spend || 0);
  let matchedTier = null;

  for (const tier of tiers) {
    if (totalSpend >= parseFloat(tier.min_spend)) {
      matchedTier = tier;
      break;
    }
  }

  if (matchedTier && customer.loyalty_tier_id !== matchedTier.id) {
    customer.loyalty_tier_id = matchedTier.id;
    await customer.save({ transaction });
  }

  return matchedTier;
};

/**
 * Process loyalty earning & redemption when a bill is created/paid
 */
const processBillLoyalty = async ({ bill, customerId, pointsToRedeem = 0, createdBy = null, transaction = null }) => {
  if (!customerId) return { pointsEarned: 0, pointsRedeemed: 0, discountAmount: 0 };

  const settings = await getRewardSettings();
  const customer = await Customer.findByPk(customerId, { transaction, include: [{ model: LoyaltyTier, as: 'loyaltyTier' }] });
  if (!customer) return { pointsEarned: 0, pointsRedeemed: 0, discountAmount: 0 };

  let currentTier = customer.loyaltyTier || await evaluateCustomerTier(customer, transaction);
  const tierMultiplier = currentTier ? parseFloat(currentTier.multiplier) : 1.0;

  const spendPerPoint = parseFloat(settings.earn_spend_per_point || 100);
  const pointValue = parseFloat(settings.point_monetary_value || 1);
  const minRedeem = parseInt(settings.min_points_to_redeem || 10, 10);
  const maxPercent = parseFloat(settings.max_redeem_percentage || 50);

  let validatedRedeemPoints = 0;
  let pointsDiscountAmount = 0;

  // 1. Process Points Redemption if requested
  if (pointsToRedeem > 0) {
    const userPoints = customer.loyalty_points || 0;
    if (userPoints >= minRedeem) {
      // Max points customer actually has
      validatedRedeemPoints = Math.min(pointsToRedeem, userPoints);
      
      // Calculate monetary value
      let calculatedDiscount = validatedRedeemPoints * pointValue;

      // Cap discount to max percentage of bill subtotal
      const maxDiscountCap = (parseFloat(bill.subtotal || bill.total || 0) * maxPercent) / 100;
      if (calculatedDiscount > maxDiscountCap) {
        calculatedDiscount = maxDiscountCap;
        validatedRedeemPoints = Math.floor(calculatedDiscount / pointValue);
      }

      pointsDiscountAmount = calculatedDiscount;

      if (validatedRedeemPoints > 0) {
        customer.loyalty_points = Math.max(0, (customer.loyalty_points || 0) - validatedRedeemPoints);
        
        await LoyaltyLedger.create({
          customer_id: customer.id,
          bill_id: bill.id,
          type: 'redeemed',
          points: -validatedRedeemPoints,
          tier_name: currentTier ? currentTier.name : 'Standard',
          balance_after: customer.loyalty_points,
          notes: `Redeemed ${validatedRedeemPoints} points on Bill #${bill.bill_number}`,
          created_by: createdBy ? String(createdBy) : 'POS',
        }, { transaction });
      }
    }
  }

  // 2. Process Points Earning based on Net Spend
  const netPaidAmount = Math.max(0, parseFloat(bill.total || 0) - pointsDiscountAmount);
  let pointsEarned = 0;

  if (netPaidAmount > 0 && spendPerPoint > 0) {
    const basePoints = netPaidAmount / spendPerPoint;
    pointsEarned = Math.floor(basePoints * tierMultiplier);

    if (pointsEarned > 0) {
      customer.loyalty_points = (customer.loyalty_points || 0) + pointsEarned;
      
      await LoyaltyLedger.create({
        customer_id: customer.id,
        bill_id: bill.id,
        type: 'earned',
        points: pointsEarned,
        tier_name: currentTier ? currentTier.name : 'Standard',
        balance_after: customer.loyalty_points,
        notes: `Earned ${pointsEarned} points (Tier: ${currentTier ? currentTier.name : 'Standard'} ${tierMultiplier}x) on Bill #${bill.bill_number}`,
        created_by: createdBy ? String(createdBy) : 'POS',
      }, { transaction });
    }
  }

  // 3. Update customer spend & re-evaluate tier
  customer.total_spend = parseFloat(customer.total_spend || 0) + netPaidAmount;
  customer.total_visits = (customer.total_visits || 0) + 1;
  await customer.save({ transaction });

  await evaluateCustomerTier(customer, transaction);

  return {
    pointsEarned,
    pointsRedeemed: validatedRedeemPoints,
    discountAmount: pointsDiscountAmount,
  };
};

/**
 * Manual points adjustment by admin
 */
const adjustCustomerPoints = async ({ customerId, points, type = 'adjusted', notes = '', createdBy = null }) => {
  const customer = await Customer.findByPk(customerId, { include: [{ model: LoyaltyTier, as: 'loyaltyTier' }] });
  if (!customer) throw new Error('Customer not found');

  const ptsInt = parseInt(points, 10);
  if (isNaN(ptsInt) || ptsInt === 0) throw new Error('Invalid points value');

  const newBalance = Math.max(0, (customer.loyalty_points || 0) + ptsInt);
  customer.loyalty_points = newBalance;
  await customer.save();

  const ledgerEntry = await LoyaltyLedger.create({
    customer_id: customer.id,
    type,
    points: ptsInt,
    tier_name: customer.loyaltyTier ? customer.loyaltyTier.name : 'Standard',
    balance_after: newBalance,
    notes: notes || 'Manual point adjustment by admin',
    created_by: createdBy ? String(createdBy) : 'Admin',
  });

  return { customer, ledgerEntry };
};

module.exports = {
  initializeRewardDefaults,
  getRewardSettings,
  evaluateCustomerTier,
  processBillLoyalty,
  adjustCustomerPoints,
};
