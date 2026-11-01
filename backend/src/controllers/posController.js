const { checkoutHash, assertSameCheckout } = require("../utils/checkoutRequest");
const costs = require("../services/inventoryCostService");
const { Op } = require('sequelize');
const {
  Service,
  Package,
  Product,
  OutletInventory,
  OutletProductPrice,
  OutletServicePrice,
  OutletPackagePrice,
  UnitMaster,
  Outlet,
  Bill,
  BillLineItem,
  Payment,
  PaymentDetail,
  Bank,
  Customer,
  CustomerLedger,
  LoyaltyTier,
  sequelize,
} = require('../models');
const stockOverride = (req) => ({ allowNegative: req.body.allowOutOfStockCheckout === true && (
  ['admin', 'super_admin'].includes(req.user?.role) || req.user?.permissions?.includes('*') || req.user?.permissions?.includes('inventory:override_stock')
) });
const rewardService = require('../services/rewardService');

// Self-healing DB Migration helper: ensures pos_terminal_id and pos_shift_id columns exist on bills table in MySQL
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
    if (!colNames.includes('created_by')) {
      await sequelize.query("ALTER TABLE bills ADD COLUMN `created_by` INT UNSIGNED NULL");
    }
  } catch (err) {
    console.error('POS Checkout Auto-migration Notice:', err.message);
  }
})();
const { printReceipt } = require('../utils/thermalPrinter');
const { sendBillWhatsAppReceipt } = require('../services/whatsappService');

// Ensure Service is available for package consumption validation

// Helper: Convert quantity to base unit
const convertToBase = (qty, conversionRatio, unit) => {
  if (unit === 'secondary' && conversionRatio) {
    return qty / conversionRatio;
  }
  return qty;
};

// Helper: Generate bill number
const generateBillNumber = async (outletId, outletCode) => {
  const year = new Date().getFullYear();
  const prefix = `GL-${year}-${outletCode || 'XXX'}-`;
  
  // Find the last bill with this prefix
  const lastBill = await Bill.findOne({
    where: {
      bill_number: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['id', 'DESC']],
  });
  
  let sequence = 1;
  if (lastBill) {
    const parts = lastBill.bill_number.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// GET /api/pos/catalog?outletId=
const getCatalog = async (req, res) => {
  try {
    const { outletId } = req.query;
    const outletIdNum = req.user?.outlet_id && !['admin', 'super_admin'].includes(req.user.role)
      ? Number(req.user.outlet_id) : outletId ? parseInt(outletId, 10) : null;

    // Fetch all active services
    const services = await Service.findAll({
      where: { status: 'active' },
    });

    // Fetch outlet-specific service prices if outletId provided
    let servicePrices = [];
    if (outletIdNum) {
      servicePrices = await OutletServicePrice.findAll({
        where: { outlet_id: outletIdNum },
      });
    }
    const servicePriceMap = Object.fromEntries(
      servicePrices.map((sp) => [sp.service_id, Number(sp.price)])
    );

    // Build service cards
    const serviceCards = await Promise.all(
      services.map(async (service) => {
        const basePrice = Number(service.price);
        const outletPrice = servicePriceMap[service.id];

        // Enrich product linkages with unit master info
        const productLinkages = await Promise.all(
          (service.product_linkages || []).map(async (link) => {
            const product = await Product.findByPk(link.inventoryId, {
              include: [{ model: UnitMaster, as: 'unitMaster' }],
            });
            return {
              ...link,
              unitMasterId: product?.unit_master_id || null,
              unitMaster: product?.unitMaster
                ? {
                    id: product.unitMaster.id,
                    groupName: product.unitMaster.group_name,
                    primaryUnit: product.unitMaster.primary_unit,
                    primaryAbbr: product.unitMaster.primary_abbr,
                    secondaryUnit: product.unitMaster.secondary_unit,
                    secondaryAbbr: product.unitMaster.secondary_abbr,
                    conversionRatio: Number(product.unitMaster.conversion_ratio),
                  }
                : null,
              consumptionUnit: link.consumptionUnit || product?.consumption_unit || 'primary',
            };
          })
        );

        // Filter by outlet assignment
        const assignedOutletIds = (service.assigned_outlet_ids || []).map(Number);
        if (outletIdNum && assignedOutletIds.length > 0 && !assignedOutletIds.includes(outletIdNum)) {
          return null;
        }

        return {
          id: service.id,
          type: 'service',
          name: service.service_name,
          price: outletPrice !== undefined ? outletPrice : basePrice,
          basePrice,
          duration: service.duration,
          productLinkages,
          assignedOutletIds,
        };
      })
    );

    // Filter out null services (outlet filtered)
    const filteredServices = serviceCards.filter((s) => s !== null);

    // Fetch all active packages
    const packages = await Package.findAll({
      where: { status: 'active' },
    });

    // Fetch outlet-specific package prices if outletId provided
    let packagePrices = [];
    if (outletIdNum) {
      packagePrices = await OutletPackagePrice.findAll({
        where: { outlet_id: outletIdNum },
      });
    }
    const packagePriceMap = Object.fromEntries(
      packagePrices.map((pp) => [pp.package_id, Number(pp.price)])
    );

    // Fetch package services for enrichment
    const { sequelize } = require('../models/db');
    const PackageService = require('../models/PackageService');
    
    const packageCards = await Promise.all(
      packages.map(async (pkg) => {
        const basePrice = Number(pkg.price);
        const outletPrice = packagePriceMap[pkg.id];

        // Get package services
        const pkgServices = await PackageService.findAll({
          where: { package_id: pkg.id },
          include: [{ model: Service, attributes: ['id', 'service_name', 'price', 'duration', 'product_linkages'] }],
        });

        const serviceItems = await Promise.all(pkgServices.map(async (ps) => {
          const rawLinkages = ps.Service?.product_linkages || [];
          const productLinkages = await Promise.all(
            rawLinkages.map(async (link) => {
              const product = await Product.findByPk(link.inventoryId, {
                include: [{ model: UnitMaster, as: 'unitMaster' }],
              });
              return {
                ...link,
                unitMasterId: product?.unit_master_id || null,
                unitMaster: product?.unitMaster
                  ? {
                      id: product.unitMaster.id,
                      groupName: product.unitMaster.group_name,
                      primaryUnit: product.unitMaster.primary_unit,
                      primaryAbbr: product.unitMaster.primary_abbr,
                      secondaryUnit: product.unitMaster.secondary_unit,
                      secondaryAbbr: product.unitMaster.secondary_abbr,
                      conversionRatio: Number(product.unitMaster.conversion_ratio),
                    }
                  : null,
                consumptionUnit: link.consumptionUnit || product?.consumption_unit || 'primary',
              };
            })
          );
          return {
            serviceId: ps.service_id,
            serviceName: ps.Service?.service_name || `Service #${ps.service_id}`,
            sessions: ps.sessions,
            productLinkages,
          };
        }));

        const totalOriginalPrice = pkgServices.reduce(
          (sum, ps) => sum + (Number(ps.Service?.price || 0) * ps.sessions),
          0
        );
        const totalDuration = pkgServices.reduce(
          (sum, ps) => sum + (Number(ps.Service?.duration || 0) * ps.sessions),
          0
        );

        // Filter by outlet assignment
        const assignedOutletIds = (pkg.assigned_outlet_ids || []).map(Number);
        if (outletIdNum && assignedOutletIds.length > 0 && !assignedOutletIds.includes(outletIdNum)) {
          return null;
        }

        return {
          id: pkg.id,
          type: 'package',
          name: pkg.package_name,
          price: outletPrice !== undefined ? outletPrice : basePrice,
          basePrice,
          duration: totalDuration,
          offerLabel: pkg.offer_label || '',
          serviceCount: serviceItems.length,
          serviceItems,
          totalOriginalPrice,
          savings: Math.max(totalOriginalPrice - (outletPrice !== undefined ? outletPrice : basePrice), 0),
          validityDays: pkg.validity_days,
          assignedOutletIds,
        };
      })
    );

    // Filter out null packages (outlet filtered)
    const filteredPackages = packageCards.filter((p) => p !== null);

    // Fetch products with inventory for outlet
    let products = [];
    let productPrices = [];

    if (outletIdNum) {
      // Get outlet inventory
      const inventory = await OutletInventory.findAll({
        where: { outlet_id: outletIdNum },
        include: [
          {
            model: Product,
            include: [{ model: UnitMaster, as: 'unitMaster' }],
          },
        ],
      });

      products = inventory.map((inv) => inv.Product).filter((p) => p && p.status === 'active');

      // Get outlet-specific prices
      productPrices = await OutletProductPrice.findAll({
        where: { outlet_id: outletIdNum },
      });
    } else {
      // Get all active products
      products = await Product.findAll({
        where: { status: 'active' },
        include: [{ model: UnitMaster, as: 'unitMaster' }],
      });
    }

    const productPriceMap = Object.fromEntries(
      productPrices.map((pp) => [pp.product_id, Number(pp.price)])
    );

    // Build inventory map for stock
    const inventoryMap = {};
    if (outletIdNum) {
      const inventory = await OutletInventory.findAll({
        where: { outlet_id: outletIdNum },
      });
      inventory.forEach((inv) => {
        inventoryMap[inv.product_id] = Number(inv.current_stock);
      });
    }

    // Build product cards
    const productCards = products.map((product) => {
      const basePrice = Number(product.unit_price);
      const outletPrice = productPriceMap[product.id];
      const stock = outletIdNum ? (inventoryMap[product.id] !== undefined ? inventoryMap[product.id] : 0) : Number(product.central_stock);

      return {
        id: product.id,
        type: 'product',
        barcode: product.barcode,
        productMeasure: Number(product.product_measure || 1),
        productMeasureUnit: product.product_measure_unit || "primary",
        name: product.item_name,
        price: outletPrice !== undefined ? outletPrice : basePrice,
        basePrice,
        stock,
        measureLabel: product.unitMaster && product.product_measure
          ? `${product.product_measure} ${product.product_measure_unit === 'primary' ? product.unitMaster.primary_abbr : product.unitMaster.secondary_abbr}`
          : null,
        unitMaster: product.unitMaster ? {
          id: product.unitMaster.id,
          groupName: product.unitMaster.group_name,
          primaryUnit: product.unitMaster.primary_unit,
          primaryAbbr: product.unitMaster.primary_abbr,
          secondaryUnit: product.unitMaster.secondary_unit,
          secondaryAbbr: product.unitMaster.secondary_abbr,
          conversionRatio: Number(product.unitMaster.conversion_ratio),
        } : null,
        purchaseUnit: product.purchase_unit,
        consumptionUnit: product.consumption_unit,
      };
    });

    // Combine and return
    const catalog = [...filteredServices, ...filteredPackages, ...productCards];

    return res.json(catalog);
  } catch (err) {
    console.error('Error fetching catalog:', err);
    return res.status(500).json({ message: 'Server error fetching catalog.' });
  }
};

// POST /api/pos/checkout
const checkout = async (req, res) => {
  const transaction = await require('../models/db').sequelize.transaction();

  try {
    const {
      customer,
      paymentMethod,
      bankId,
      outletId,
      subtotal: requestedSubtotal,
      discountType,
      discountValue,
      discountAmount,
      tax,
      total: requestedTotal,
      lineItems,
      paymentDetails,
      transactionReference,
      paymentNotes,
      bankAccountId,
      allowOutOfStockCheckout,
      couponId,
      couponCode,
      voucherId,
      voucherCode,
      voucherDiscountAmount,
      posTerminalId,
      posShiftId,
    } = req.body;

    // Validation
    if (!outletId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'outletId is required.' });
    }
    const validPaymentMethods = ['Cash', 'Card', 'UPI', 'Split', 'Store Credit', 'Unpaid'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Valid paymentMethod is required.' });
    }
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'lineItems are required.' });
    }

    costs.validateLines(lineItems);
    const subtotal = Number(costs.money(lineItems.reduce((sum, item) => sum.plus(costs.numeric(item.price, 'Selling price').times(costs.positive(item.qty))), costs.D(0))));
    const nonnegative = (value, label) => {
      const amount = costs.D(value || 0);
      if (!amount.isFinite() || amount.lt(0)) costs.invalid(`${label} must be non-negative.`);
      return Number(costs.money(amount));
    };
    const saleDiscount = nonnegative(discountAmount, 'Discount');
    const voucherDiscount = nonnegative(voucherDiscountAmount, 'Voucher discount');
    if (saleDiscount + voucherDiscount > subtotal) costs.invalid('Discounts exceed the sale subtotal.');
    let total = Number(costs.money(costs.D(subtotal).minus(saleDiscount).minus(voucherDiscount).plus(nonnegative(tax, 'Tax'))));

    // Check outlet exists
    const outlet = await Outlet.findByPk(outletId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!outlet) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Outlet not found.' });
    }

    if (req.user?.outlet_id && !['admin', 'super_admin'].includes(req.user.role) && Number(req.user.outlet_id) !== Number(outletId)) {
      const error = new Error('You cannot sell stock from another outlet.'); error.status = 403; throw error;
    }
    const requestKey = req.body.checkoutKey;
    const requestHash = checkoutHash(req.body);
    if (requestKey !== undefined && (typeof requestKey !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(requestKey))) costs.invalid('Invalid checkout request key.');
    if (requestKey) {
      const existing = await Bill.findOne({ where: { request_key: requestKey }, transaction });
      if (existing) {
        assertSameCheckout(existing, requestHash);
        if (Number(existing.outlet_id) !== Number(outletId)) costs.invalid('Checkout request belongs to another outlet.');
        await transaction.rollback();
        req.params = { ...req.params, id: existing.id };
        return getBillById(req, res);
      }
    }
    // Costs and all stock requirements are validated atomically by applyBillLines below.
    // Generate bill number
    const billNumber = await generateBillNumber(outletId, outlet.code);

    // Resolve customer if provided, or auto-create new Customer record
    let targetCustomer = null;
    const inputName = customer?.name ? String(customer.name).trim() : '';
    const inputPhone = customer?.phone ? String(customer.phone).trim() : '';
    const isDefaultGuestName = inputName.toLowerCase() === 'walk-in guest' || inputName.toLowerCase() === 'walk-in';
    const isDefaultGuestPhone = inputPhone === '0000000000';

    if (customer?.id) {
      targetCustomer = await Customer.findByPk(customer.id, { transaction });
    }

    if (!targetCustomer && inputPhone && !isDefaultGuestPhone) {
      targetCustomer = await Customer.findOne({ where: { phone: inputPhone }, transaction });
    }

    if (!targetCustomer && inputName && !isDefaultGuestName) {
      targetCustomer = await Customer.findOne({ where: { name: inputName }, transaction });
    }

    // Auto-create new Customer in database if staff entered new customer details in POS
    if (!targetCustomer && (inputName || inputPhone) && !isDefaultGuestName && !isDefaultGuestPhone) {
      targetCustomer = await Customer.create(
        {
          name: inputName || inputPhone,
          phone: inputPhone || 'N/A',
          email: customer.email || null,
          gender: customer.gender || 'Female',
          credit_balance: 0.00,
          total_spend: 0.00,
          total_visits: 0,
        },
        { transaction }
      );
      console.log(`[POS] Auto-created new Customer record: ${targetCustomer.name} (ID: ${targetCustomer.id})`);
    }

    // Fallback to default Walk-in Guest customer if no customer was entered/found
    if (!targetCustomer) {
      targetCustomer = await Customer.findOne({ where: { phone: '0000000000' }, transaction });
    }

    // Build payment detail rows: prefer split paymentDetails from frontend
    const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'store_credit'];
    const modeMap = { Cash: 'cash', Card: 'card', UPI: 'upi', 'Store Credit': 'store_credit' };

    let detailRows = [];
    if (Array.isArray(paymentDetails) && paymentDetails.length > 0) {
      for (const d of paymentDetails) {
        const mode = d.paymentMode;
        if (!validModes.includes(mode)) continue;
        const amount = Math.max(0, Number(d.amount) || 0);
        if (amount > 0) detailRows.push({ payment_mode: mode, amount, bank_account_id: d.bankAccountId || null });
      }
    } else if (paymentDetails === undefined && paymentMethod && paymentMethod !== 'Unpaid') {
      // Legacy fallback when paymentDetails parameter is missing
      const singleMode = modeMap[paymentMethod] || 'cash';
      const defaultAmt = Math.max(0, Number(total) || 0);
      if (defaultAmt > 0) {
        detailRows = [{ payment_mode: singleMode, amount: defaultAmt, bank_account_id: null }];
      }
    }

    const totalPaid = detailRows.reduce((s, d) => s + d.amount, 0);
    const billTotalNum = Number(total || 0);
    const billStatus = totalPaid >= billTotalNum ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');
    const effectivePaymentMethod = paymentMethod || (totalPaid === 0 ? 'Unpaid' : 'Cash');

    // Create bill
    const bill = await Bill.create(
      {
        bill_number: billNumber,
        request_key: req.body.checkoutKey || null,
        request_hash: requestHash,
        outlet_id: outletId,
        customer_id: targetCustomer?.id || null,
        customer_name: customer?.name || targetCustomer?.name || null,
        customer_phone: customer?.phone || targetCustomer?.phone || null,
        payment_method: effectivePaymentMethod,
        bank_id: bankId || null,
        subtotal: subtotal || 0,
        discount_type: ['flat', 'fixed'].includes(discountType) ? 'flat' : discountType || null,
        discount_value: discountValue || 0,
        discount_amount: discountAmount || 0,
        tax: tax || 0,
        total: total || 0,
        status: billStatus,
        coupon_id: couponId || null,
        coupon_code: couponCode || null,
        voucher_id: voucherId || null,
        voucher_code: voucherCode || null,
        voucher_discount_amount: voucherDiscountAmount || 0,
        pos_terminal_id: posTerminalId || req.body.pos_terminal_id || null,
        pos_shift_id: posShiftId || req.body.pos_shift_id || null,
        created_by: req.user?.id || req.admin?.id || req.body.createdBy || null,
      },
      { transaction }
    );

    if (couponId) {
      const Coupon = require('../models/Coupon');
      await Coupon.increment('used_count', { by: 1, where: { id: couponId }, transaction });
    }

    if (voucherId) {
      const CustomerVoucher = require('../models/CustomerVoucher');
      const v = await CustomerVoucher.findByPk(voucherId, { transaction });
      if (v) {
        const discAmt = parseFloat(voucherDiscountAmount || 0);
        const newBal = Math.max(0, parseFloat(v.balance_value || 0) - discAmt);
        v.balance_value = newBal;
        if (newBal <= 0 || v.voucher_type !== 'cash') {
          v.status = 'redeemed';
        }
        v.redeemed_at = new Date();
        v.redeemed_bill_id = bill.id;
        await v.save({ transaction });
      }
    }

    await costs.applyBillLines(bill, lineItems, [], transaction, stockOverride(req));

    // Process loyalty points earning and redemption
    let loyaltyResult = { pointsEarned: 0, pointsRedeemed: 0, discountAmount: 0 };
    if (targetCustomer) {
      const pointsToRedeem = parseInt(req.body.pointsToRedeem || req.body.points_redeemed || 0, 10);
      loyaltyResult = await rewardService.processBillLoyalty({
        bill,
        customerId: targetCustomer.id,
        pointsToRedeem,
        createdBy: req.user?.id || req.admin?.id || req.body.createdBy,
        transaction,
      });

      // Update bill with loyalty details
      await bill.update({
        points_earned: loyaltyResult.pointsEarned,
        points_redeemed: loyaltyResult.pointsRedeemed,
        points_discount_amount: loyaltyResult.discountAmount,
        total: Number(costs.money(costs.D(total).minus(loyaltyResult.discountAmount))),
        status: totalPaid >= Number(costs.money(costs.D(total).minus(loyaltyResult.discountAmount))) ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid',
      }, { transaction });

      total = Number(bill.total);
      await targetCustomer.reload({ transaction, lock: transaction.LOCK.UPDATE });
      // Handle Store Credit & Unpaid due charges
      let newCreditBalance = Number(targetCustomer.credit_balance || 0);

      const storeCreditPaid = detailRows
        .filter((d) => d.payment_mode === 'store_credit')
        .reduce((sum, d) => sum + d.amount, 0);

      if (storeCreditPaid > 0) {
        newCreditBalance -= storeCreditPaid;
        await CustomerLedger.create({
          customer_id: targetCustomer.id,
          bill_id: bill.id,
          type: 'bill_payment',
          amount: storeCreditPaid,
          balance_after: newCreditBalance,
          payment_method: 'Store Credit',
          notes: `Bill #${billNumber} payment via Store Credit`,
        }, { transaction });
      }

      const unpaidAmount = Math.max(0, Number(total || 0) - totalPaid);
      if (unpaidAmount > 0) {
        newCreditBalance -= unpaidAmount;
        await CustomerLedger.create({
          customer_id: targetCustomer.id,
          bill_id: bill.id,
          type: 'due_charge',
          amount: unpaidAmount,
          balance_after: newCreditBalance,
          payment_method: null,
          notes: `Unpaid bill #${billNumber} marked as Customer Due`,
        }, { transaction });
      }

      if (newCreditBalance !== Number(targetCustomer.credit_balance || 0)) {
        await targetCustomer.update({ credit_balance: newCreditBalance }, { transaction });
      }
    }

    // Auto-award next-visit reward voucher based on bill total & active rules
    try {
      const { awardBillVoucher } = require('./voucherController');
      await awardBillVoucher({
        bill,
        customer: targetCustomer,
        userId: req.user?.id || req.admin?.id || req.body.createdBy || null,
        transaction,
      });
    } catch (vAwardErr) {
      console.warn('[Checkout] Auto-award voucher error (non-blocking):', vAwardErr.message);
    }

    // Use the first non-cash detail's bank as the primary bank for the Payment record
    const primaryBankId = detailRows.find((d) => d.payment_mode !== 'cash' && d.bank_account_id)?.bank_account_id
      || bankAccountId || bankId || null;

    const createdPayment = await Payment.create(
      {
        bill_id: bill.id,
        purchase_order_id: null,
        expense_id: null,
        pos_id: null,
        total_amount: totalPaid,
        status: totalPaid > 0 ? 'completed' : 'pending',
        transaction_reference: (transactionReference || '').trim() || null,
        notes: (paymentNotes || '').trim() || null,
        payment_date: new Date().toISOString().split('T')[0],
        bank_account_id: primaryBankId,
      },
      { transaction }
    );

    if (detailRows.length > 0) {
      await PaymentDetail.bulkCreate(
        detailRows.map((row) => ({ ...row, payment_id: createdPayment.id })),
        { transaction }
      );
    }

    await transaction.commit();

    // Fetch the complete bill with line items and payment
    const completeBill = await Bill.findByPk(bill.id, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });

    // Format response
    const response = {
      id: completeBill.id,
      billNumber: completeBill.bill_number,
      createdAt: completeBill.createdAt,
      customer: {
        name: completeBill.customer_name,
        phone: completeBill.customer_phone,
      },
      paymentMethod: completeBill.payment_method,
      outletId: completeBill.outlet_id,
      outletName: outlet.name,
      status: completeBill.status,
      subtotal: Number(completeBill.subtotal),
      discountType: completeBill.discount_type,
      discountValue: Number(completeBill.discount_value),
      discountAmount: Number(completeBill.discount_amount),
      couponId: completeBill.coupon_id,
      couponCode: completeBill.coupon_code,
      voucherId: completeBill.voucher_id,
      voucherCode: completeBill.voucher_code,
      voucherDiscountAmount: Number(completeBill.voucher_discount_amount || 0),
      pointsDiscountAmount: Number(completeBill.points_discount_amount || 0),
      awardedVoucherId: completeBill.awarded_voucher_id || null,
      awardedVoucherCode: completeBill.awarded_voucher_code || null,
      awardedVoucherAmount: Number(completeBill.awarded_voucher_amount || 0),
      awarded_voucher_code: completeBill.awarded_voucher_code || null,
      awarded_voucher_amount: Number(completeBill.awarded_voucher_amount || 0),
      awardedVoucher: completeBill.awarded_voucher_code ? {
        id: completeBill.awarded_voucher_id,
        code: completeBill.awarded_voucher_code,
        amount: Number(completeBill.awarded_voucher_amount || 0),
      } : null,
      tax: Number(completeBill.tax),
      total: Number(completeBill.total),
      lineItems: completeBill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        ...costs.saleSnapshot(li),
        staffAssigned: li.staff_assigned,
        staffIds: li.staff_ids,
        productConsumption: li.product_consumption,
        includedServices: li.included_services,
      })),
      payments: (completeBill.payments || []).map((p) => ({
        id: p.id,
        totalAmount: Number(p.total_amount),
        status: p.status,
        transactionReference: p.transaction_reference || '',
        notes: p.notes || '',
        paymentDate: p.payment_date,
        details: (p.details || []).map((d) => ({
          id: d.id,
          paymentMode: d.payment_mode,
          amount: Number(d.amount),
          bankAccountId: d.bank_account_id || null,
        })),
      })),
    };

    // Fire-and-forget: print thermal receipt (errors logged, never block response)
    printReceipt(response).catch((printErr) => {
      console.warn('[Checkout] Thermal print failed (non-blocking):', printErr.message);
    });

    // Safe non-blocking WhatsApp bill receipt dispatch
    const shouldSendWhatsApp = req.body.sendWhatsApp !== undefined ? Boolean(req.body.sendWhatsApp) : true;
    if (shouldSendWhatsApp) {
      try {
        const waFormat = req.body.printTemplate || req.body.format || 'thermal';
        const waPaperWidth = req.body.paperWidth || 48;
        const waResult = await sendBillWhatsAppReceipt(response, {
          format: waFormat,
          paperWidth: waPaperWidth,
        });
        response.whatsapp = waResult;
      } catch (waErr) {
        console.warn('[Checkout] WhatsApp receipt failed (non-blocking):', waErr.message);
        response.whatsapp = {
          success: false,
          error: waErr.message || 'Failed to send WhatsApp message.',
        };
      }
    } else {
      console.log('[Checkout] WhatsApp auto-send skipped as per setting / request preference.');
      response.whatsapp = { skipped: true };
    }


    return res.status(201).json(response);
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error during checkout:', err);
    const retry = ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(err.original?.code);
    return res.status(retry ? 409 : err.status || 500).json({ message: retry ? 'Stock changed while processing. Retry this checkout with the same request key.' : err.status ? err.message : 'Server error during checkout.' });
  }
};

// GET /api/pos/bills
const getBills = async (req, res) => {
  try {
    const { outletId, search, paymentMethod } = req.query;
    const user = req.user || req.admin;
    const isCashier = user?.role === 'cashier' || user?.role === 'pos';

    // Build where clause
    const where = {};

    if (isCashier) {
      where.created_by = user.id;
    } else if (user?.role !== 'super_admin' && user?.role !== 'admin') {
      if (user?.outlet_id) {
        where.outlet_id = user.outlet_id;
      }
    } else if (outletId) {
      where.outlet_id = outletId;
    }

    if (paymentMethod && ['Cash', 'Card', 'UPI', 'Split', 'Store Credit', 'Unpaid'].includes(paymentMethod)) {
      where.payment_method = paymentMethod;
    }

    // Search by bill number or customer
    if (search) {
      where[Op.or] = [
        { bill_number: { [Op.like]: `%${search}%` } },
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const bills = await Bill.findAll({
      where,
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Outlet, attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Format response
    const response = bills.map((bill) => ({
      id: bill.id,
      billNumber: bill.bill_number,
      createdAt: bill.createdAt,
      createdBy: bill.created_by,
      customer: {
        name: bill.customer_name,
        phone: bill.customer_phone,
      },
      paymentMethod: bill.payment_method,
      outletId: bill.outlet_id,
      outletName: bill.Outlet?.name || 'Unknown',
      status: bill.status,
      subtotal: Number(bill.subtotal),
      discountType: bill.discount_type,
      discountValue: Number(bill.discount_value),
      discountAmount: Number(bill.discount_amount),
      couponId: bill.coupon_id,
      couponCode: bill.coupon_code,
      voucherId: bill.voucher_id,
      voucherCode: bill.voucher_code,
      voucherDiscountAmount: Number(bill.voucher_discount_amount || 0),
      pointsDiscountAmount: Number(bill.points_discount_amount || 0),
      awardedVoucherId: bill.awarded_voucher_id || null,
      awardedVoucherCode: bill.awarded_voucher_code || null,
      awardedVoucherAmount: Number(bill.awarded_voucher_amount || 0),
      awarded_voucher_code: bill.awarded_voucher_code || null,
      awarded_voucher_amount: Number(bill.awarded_voucher_amount || 0),
      awardedVoucher: bill.awarded_voucher_code ? {
        id: bill.awarded_voucher_id,
        code: bill.awarded_voucher_code,
        amount: Number(bill.awarded_voucher_amount || 0),
      } : null,
      tax: Number(bill.tax),
      total: Number(bill.total),
      lineItems: bill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        ...costs.saleSnapshot(li),
        staffAssigned: li.staff_assigned,
        staffIds: li.staff_ids,
        productConsumption: li.product_consumption,
        includedServices: li.included_services,
      })),
      payments: (bill.payments || []).map((p) => ({
        id: p.id,
        totalAmount: Number(p.total_amount),
        status: p.status,
        transactionReference: p.transaction_reference || '',
        notes: p.notes || '',
        paymentDate: p.payment_date,
        details: (p.details || []).map((d) => ({
          id: d.id,
          paymentMode: d.payment_mode,
          amount: Number(d.amount),
          bankAccountId: d.bank_account_id || null,
        })),
      })),
    }));

    return res.json(response);
  } catch (err) {
    console.error('Error fetching bills:', err);
    return res.status(500).json({ message: 'Server error fetching bills.' });
  }
};

// GET /api/pos/bills/:id
const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Outlet, attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    if (req.user?.outlet_id && !['admin', 'super_admin'].includes(req.user.role) && Number(req.user.outlet_id) !== Number(bill.outlet_id)) {
      return res.status(403).json({ message: 'You cannot access another outlet invoice.' });
    }

    // Format response
    const response = {
      id: bill.id,
      billNumber: bill.bill_number,
      createdAt: bill.createdAt,
      customer: {
        name: bill.customer_name,
        phone: bill.customer_phone,
      },
      paymentMethod: bill.payment_method,
      outletId: bill.outlet_id,
      outletName: bill.Outlet?.name || 'Unknown',
      status: bill.status,
      subtotal: Number(bill.subtotal),
      discountType: bill.discount_type,
      discountValue: Number(bill.discount_value),
      discountAmount: Number(bill.discount_amount),
      couponId: bill.coupon_id,
      couponCode: bill.coupon_code,
      voucherId: bill.voucher_id,
      voucherCode: bill.voucher_code,
      voucherDiscountAmount: Number(bill.voucher_discount_amount || 0),
      pointsDiscountAmount: Number(bill.points_discount_amount || 0),
      awardedVoucherId: bill.awarded_voucher_id || null,
      awardedVoucherCode: bill.awarded_voucher_code || null,
      awardedVoucherAmount: Number(bill.awarded_voucher_amount || 0),
      awarded_voucher_code: bill.awarded_voucher_code || null,
      awarded_voucher_amount: Number(bill.awarded_voucher_amount || 0),
      awardedVoucher: bill.awarded_voucher_code ? {
        id: bill.awarded_voucher_id,
        code: bill.awarded_voucher_code,
        amount: Number(bill.awarded_voucher_amount || 0),
      } : null,
      tax: Number(bill.tax),
      total: Number(bill.total),
      lineItems: bill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        ...costs.saleSnapshot(li),
        staffAssigned: li.staff_assigned,
        staffIds: li.staff_ids,
        productConsumption: li.product_consumption,
        includedServices: li.included_services,
      })),
      payments: (bill.payments || []).map((p) => ({
        id: p.id,
        totalAmount: Number(p.total_amount),
        status: p.status,
        transactionReference: p.transaction_reference || '',
        notes: p.notes || '',
        paymentDate: p.payment_date,
        details: (p.details || []).map((d) => ({
          id: d.id,
          paymentMode: d.payment_mode,
          amount: Number(d.amount),
          bankAccountId: d.bank_account_id || null,
        })),
      })),
    };

    return res.json(response);
  } catch (err) {
    console.error('Error fetching bill:', err);
    return res.status(500).json({ message: 'Server error fetching bill.' });
  }
};

// POST /api/pos/bills/:id/payments
const addBillPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { paymentDetails, paymentMethod, bankAccountId, transactionReference, paymentNotes } = req.body;

    const bill = await Bill.findByPk(id, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
      transaction,
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bill not found.' });
    }

    const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'store_credit'];
    const modeMap = { Cash: 'cash', Card: 'card', UPI: 'upi', 'Store Credit': 'store_credit' };
    let detailRows = [];

    if (Array.isArray(paymentDetails) && paymentDetails.length > 0) {
      for (const d of paymentDetails) {
        const mode = d.paymentMode;
        if (!validModes.includes(mode)) continue;
        const amt = Math.max(0, Number(d.amount) || 0);
        if (amt > 0) detailRows.push({ payment_mode: mode, amount: amt, bank_account_id: d.bankAccountId || null });
      }
    } else if (req.body.amount && Number(req.body.amount) > 0) {
      const mode = modeMap[paymentMethod] || 'cash';
      const amt = Math.max(0, Number(req.body.amount) || 0);
      detailRows.push({ payment_mode: mode, amount: amt, bank_account_id: bankAccountId || null });
    }

    const addedPaid = detailRows.reduce((s, d) => s + d.amount, 0);
    if (addedPaid <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Valid payment amount greater than 0 is required.' });
    }

    // Calculate existing paid amount across all previous payments
    let existingPaid = 0;
    (bill.payments || []).forEach((p) => {
      (p.details || []).forEach((d) => {
        existingPaid += Number(d.amount || 0);
      });
    });

    const newTotalPaid = existingPaid + addedPaid;
    const billTotal = Number(bill.total || 0);
    const newStatus = newTotalPaid >= billTotal ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : 'unpaid');

    const primaryBankId = detailRows.find((d) => d.payment_mode !== 'cash' && d.bank_account_id)?.bank_account_id
      || bankAccountId || null;

    // Create payment record
    const paymentRecord = await Payment.create(
      {
        bill_id: bill.id,
        purchase_order_id: null,
        expense_id: null,
        pos_id: null,
        total_amount: addedPaid,
        status: 'completed',
        transaction_reference: (transactionReference || '').trim() || null,
        notes: (paymentNotes || '').trim() || null,
        payment_date: new Date().toISOString().split('T')[0],
        bank_account_id: primaryBankId,
      },
      { transaction }
    );

    await PaymentDetail.bulkCreate(
      detailRows.map((row) => ({ ...row, payment_id: paymentRecord.id })),
      { transaction }
    );

    const modeLabels = { cash: 'Cash', card: 'Card', upi: 'UPI', store_credit: 'Store Credit' };
    const addedMethodLabel = detailRows.length > 1 ? 'Split' : (modeLabels[detailRows[0]?.payment_mode] || 'Cash');
    const updatedPaymentMethod = bill.payment_method === 'Unpaid' ? addedMethodLabel : bill.payment_method;

    await bill.update({
      status: newStatus,
      payment_method: updatedPaymentMethod,
    }, { transaction });

    // Handle Customer Ledger if customer is attached
    if (bill.customer_id) {
      const Customer = require('../models/Customer');
      const CustomerLedger = require('../models/CustomerLedger');
      const targetCustomer = await Customer.findByPk(bill.customer_id, { transaction });
      if (targetCustomer) {
        let newCreditBalance = Number(targetCustomer.credit_balance || 0);

        // Deduct Store Credit if store_credit mode was used
        const storeCreditPaid = detailRows
          .filter((d) => d.payment_mode === 'store_credit')
          .reduce((sum, d) => sum + d.amount, 0);

        if (storeCreditPaid > 0) {
          newCreditBalance -= storeCreditPaid;
        }

        // Add payment entry into CustomerLedger (reduces due)
        newCreditBalance += addedPaid;

        await CustomerLedger.create({
          customer_id: targetCustomer.id,
          bill_id: bill.id,
          type: 'bill_payment',
          amount: addedPaid,
          balance_after: newCreditBalance,
          payment_method: addedMethodLabel,
          notes: `Payment of RM ${addedPaid.toFixed(2)} collected for bill #${bill.bill_number}`,
        }, { transaction });

        await targetCustomer.update({
          credit_balance: newCreditBalance,
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated complete bill
    const completeBill = await Bill.findByPk(bill.id, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Outlet, attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });

    const formattedBill = {
      id: completeBill.id,
      billNumber: completeBill.bill_number,
      createdAt: completeBill.createdAt,
      customer: {
        name: completeBill.customer_name,
        phone: completeBill.customer_phone,
      },
      paymentMethod: completeBill.payment_method,
      outletId: completeBill.outlet_id,
      outletName: completeBill.Outlet?.name || 'Unknown',
      status: completeBill.status,
      subtotal: Number(completeBill.subtotal),
      discountType: completeBill.discount_type,
      discountValue: Number(completeBill.discount_value),
      discountAmount: Number(completeBill.discount_amount),
      couponId: completeBill.coupon_id,
      couponCode: completeBill.coupon_code,
      voucherId: completeBill.voucher_id,
      voucherCode: completeBill.voucher_code,
      voucherDiscountAmount: Number(completeBill.voucher_discount_amount || 0),
      pointsDiscountAmount: Number(completeBill.points_discount_amount || 0),
      awardedVoucherId: completeBill.awarded_voucher_id || null,
      awardedVoucherCode: completeBill.awarded_voucher_code || null,
      awardedVoucherAmount: Number(completeBill.awarded_voucher_amount || 0),
      awarded_voucher_code: completeBill.awarded_voucher_code || null,
      awarded_voucher_amount: Number(completeBill.awarded_voucher_amount || 0),
      awardedVoucher: completeBill.awarded_voucher_code ? {
        id: completeBill.awarded_voucher_id,
        code: completeBill.awarded_voucher_code,
        amount: Number(completeBill.awarded_voucher_amount || 0),
      } : null,
      tax: Number(completeBill.tax),
      total: Number(completeBill.total),
      lineItems: completeBill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        ...costs.saleSnapshot(li),
        staffAssigned: li.staff_assigned,
        staffIds: li.staff_ids,
        productConsumption: li.product_consumption,
        includedServices: li.included_services,
      })),
      payments: (completeBill.payments || []).map((p) => ({
        id: p.id,
        totalAmount: Number(p.total_amount),
        status: p.status,
        transactionReference: p.transaction_reference || '',
        notes: p.notes || '',
        paymentDate: p.payment_date,
        details: (p.details || []).map((d) => ({
          id: d.id,
          paymentMode: d.payment_mode,
          amount: Number(d.amount),
          bankAccountId: d.bank_account_id || null,
        })),
      })),
    };

    return res.status(200).json({
      message: 'Payment added successfully.',
      bill: formattedBill,
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Error adding payment to bill:', err);
    return res.status(500).json({ message: 'Server error adding payment to bill.' });
  }
};

// PUT /api/pos/bills/:id
const updateBill = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      customer,
      lineItems,
      discountType,
      discountValue,
      discountAmount,
      tax,
      subtotal,
      total,
      couponId,
      couponCode,
      paymentDetails,
      paymentMethod,
      transactionReference,
      paymentNotes,
    } = req.body;

    await Bill.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    const bill = await Bill.findByPk(id, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
      transaction,
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bill not found.' });
    }

    const outletId = bill.outlet_id;

    // 1. Update customer info if provided
    if (customer) {
      if (customer.name !== undefined) bill.customer_name = customer.name.trim() || 'Walk-in Guest';
      if (customer.phone !== undefined) bill.customer_phone = customer.phone.trim() || '';
    }

    if (req.user?.outlet_id && !['admin', 'super_admin'].includes(req.user.role) && Number(req.user.outlet_id) !== Number(outletId)) {
      const error = new Error('You cannot edit another outlet invoice.'); error.status = 403; throw error;
    }
    if (lineItems !== undefined) await costs.applyBillLines(bill, lineItems, bill.lineItems, transaction, stockOverride(req));

    // 3. Update totals & discounts
    const calculatedSubtotal = Array.isArray(lineItems)
      ? Number(costs.money(lineItems.reduce((sum, item) => sum.plus(costs.positive(item.qty).times(costs.numeric(item.price, 'Selling price'))), costs.D(0))))
      : Number(bill.subtotal);

    const calcDiscountType = discountType !== undefined ? discountType : bill.discount_type;
    const calcDiscountValue = discountValue !== undefined ? Number(discountValue) : Number(bill.discount_value);

    let calcDiscountAmount = Number(bill.discount_amount || 0);
    if (discountAmount !== undefined) {
      calcDiscountAmount = Number(discountAmount);
    } else if (['flat', 'fixed'].includes(calcDiscountType)) {
      calcDiscountAmount = Math.min(calculatedSubtotal, calcDiscountValue);
    } else if (calcDiscountType === 'percent' || calcDiscountType === 'percentage') {
      calcDiscountAmount = (calculatedSubtotal * calcDiscountValue) / 100;
    }

    calcDiscountAmount = Number(costs.numeric(calcDiscountAmount, 'Discount', { places: 2 }));
    const calculatedTax = Number(costs.numeric(tax !== undefined ? tax : bill.tax, 'Tax', { places: 2 }));
    const voucherDiscount = Number(bill.voucher_discount_amount || 0);
    if (req.body.voucherDiscountAmount !== undefined && Number(req.body.voucherDiscountAmount) !== voucherDiscount) costs.invalid('Voucher redemption cannot be changed through invoice editing.');
    if (![calculatedTax, calcDiscountAmount, voucherDiscount].every((v) => Number.isFinite(v) && v >= 0)
        || calcDiscountAmount + voucherDiscount > calculatedSubtotal) costs.invalid('Invalid tax or sale discounts.');
    const pointsDiscount = Number(bill.points_discount_amount || 0);
    if (calcDiscountAmount + voucherDiscount + pointsDiscount > calculatedSubtotal) costs.invalid('Existing redeemed discounts exceed the edited subtotal.');
    const calculatedTotal = Number(costs.money(costs.D(calculatedSubtotal).minus(calcDiscountAmount).minus(voucherDiscount).minus(pointsDiscount).plus(calculatedTax)));

    // 4. Replace payments if paymentDetails provided in the request
    const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'store_credit'];
    let totalPaid = 0;

    if (Array.isArray(paymentDetails)) {
      const newPaymentDetailRows = paymentDetails
        .filter((d) => validModes.includes(d.paymentMode) && Number(d.amount) > 0)
        .map((d) => ({ payment_mode: d.paymentMode, amount: Number(d.amount), bank_account_id: d.bankAccountId || null }));

      // Delete existing payments and their details
      const existingPaymentIds = (bill.payments || []).map((p) => p.id);
      if (existingPaymentIds.length > 0) {
        await PaymentDetail.destroy({ where: { payment_id: existingPaymentIds }, transaction });
        await Payment.destroy({ where: { id: existingPaymentIds }, transaction });
      }

      // Create new payment record if any valid details exist
      if (newPaymentDetailRows.length > 0) {
        totalPaid = newPaymentDetailRows.reduce((s, d) => s + d.amount, 0);
        const newPayment = await Payment.create({
          bill_id: bill.id,
          payment_method: paymentMethod || 'Cash',
          total_amount: totalPaid,
          status: 'completed',
          transaction_reference: transactionReference || null,
          notes: paymentNotes || null,
          payment_date: new Date(),
        }, { transaction });
        await PaymentDetail.bulkCreate(
          newPaymentDetailRows.map((d) => ({ ...d, payment_id: newPayment.id })),
          { transaction }
        );
      }
    } else {
      // paymentDetails not sent — keep old payments, sum them for status
      (bill.payments || []).forEach((p) => {
        (p.details || []).forEach((d) => {
          totalPaid += Number(d.amount || 0);
        });
      });
    }

    // 5. Determine new bill status based on total paid vs updated total
    let newStatus = 'unpaid';
    if (totalPaid >= calculatedTotal && calculatedTotal > 0) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid';
    } else if (totalPaid === 0 && calculatedTotal === 0) {
      newStatus = 'paid';
    }

    await bill.update({
      subtotal: calculatedSubtotal,
      discount_type: ['flat', 'fixed'].includes(calcDiscountType) ? 'flat' : calcDiscountType || null,
      discount_value: calcDiscountValue || 0,
      discount_amount: calcDiscountAmount || 0,
      tax: calculatedTax,
      total: calculatedTotal,
      payment_method: paymentMethod !== undefined ? paymentMethod : bill.payment_method,
      status: newStatus,
      coupon_id: couponId !== undefined ? couponId : bill.coupon_id,
      coupon_code: couponCode !== undefined ? couponCode : bill.coupon_code,
    }, { transaction });

    await transaction.commit();

    // Fetch updated complete bill
    const completeBill = await Bill.findByPk(bill.id, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Outlet, attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });

    const response = {
      id: completeBill.id,
      billNumber: completeBill.bill_number,
      createdAt: completeBill.createdAt,
      customer: {
        name: completeBill.customer_name,
        phone: completeBill.customer_phone,
      },
      paymentMethod: completeBill.payment_method,
      outletId: completeBill.outlet_id,
      outletName: completeBill.Outlet?.name || 'Unknown',
      status: completeBill.status,
      subtotal: Number(completeBill.subtotal),
      discountType: completeBill.discount_type,
      discountValue: Number(completeBill.discount_value),
      discountAmount: Number(completeBill.discount_amount),
      couponId: completeBill.coupon_id,
      couponCode: completeBill.coupon_code,
      voucherId: completeBill.voucher_id,
      voucherCode: completeBill.voucher_code,
      voucherDiscountAmount: Number(completeBill.voucher_discount_amount || 0),
      pointsDiscountAmount: Number(completeBill.points_discount_amount || 0),
      awardedVoucherId: completeBill.awarded_voucher_id || null,
      awardedVoucherCode: completeBill.awarded_voucher_code || null,
      awardedVoucherAmount: Number(completeBill.awarded_voucher_amount || 0),
      awarded_voucher_code: completeBill.awarded_voucher_code || null,
      awarded_voucher_amount: Number(completeBill.awarded_voucher_amount || 0),
      awardedVoucher: completeBill.awarded_voucher_code ? {
        id: completeBill.awarded_voucher_id,
        code: completeBill.awarded_voucher_code,
        amount: Number(completeBill.awarded_voucher_amount || 0),
      } : null,
      tax: Number(completeBill.tax),
      total: Number(completeBill.total),
      lineItems: completeBill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        ...costs.saleSnapshot(li),
        staffAssigned: li.staff_assigned,
        staffIds: li.staff_ids,
        productConsumption: li.product_consumption,
        includedServices: li.included_services,
      })),
      payments: (completeBill.payments || []).map((p) => ({
        id: p.id,
        totalAmount: Number(p.total_amount),
        status: p.status,
        transactionReference: p.transaction_reference || '',
        notes: p.notes || '',
        paymentDate: p.payment_date,
        details: (p.details || []).map((d) => ({
          id: d.id,
          paymentMode: d.payment_mode,
          amount: Number(d.amount),
          bankAccountId: d.bank_account_id || null,
        })),
      })),
    };

    return res.status(200).json({
      message: 'Invoice updated successfully.',
      bill: response,
    });
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error updating invoice:', err);
    return res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error updating invoice.' });
  }
};

// POST /api/pos/bills/:id/send-whatsapp
const sendWhatsAppBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByPk(id, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
        { model: Outlet, attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    // Fetch default/active bank upiId for QR Code generation
    let upiId = process.env.DEFAULT_UPI_ID || 'glowy@okicici';
    try {
      const activeBank = await Bank.findOne({
        where: {
          isActive: true,
          upi_id: { [Op.ne]: null },
        },
        order: [['is_default', 'DESC']],
      });
      if (activeBank) {
        const foundUpi = activeBank.upiId || activeBank.upi_id || activeBank.get('upi_id') || activeBank.get('upiId');
        if (foundUpi) upiId = foundUpi;
      }
    } catch (_) {}


    const billData = {
      id: bill.id,
      billNumber: bill.bill_number,
      createdAt: bill.createdAt,
      customer: {
        name: bill.customer_name,
        phone: bill.customer_phone,
      },
      paymentMethod: bill.payment_method,
      outletId: bill.outlet_id,
      outletName: bill.Outlet?.name || 'Glowy Saloon',
      status: bill.status,
      upiId: upiId,

      subtotal: Number(bill.subtotal),
      discountType: bill.discount_type,
      discountValue: Number(bill.discount_value),
      discountAmount: Number(bill.discount_amount),
      couponId: bill.coupon_id,
      couponCode: bill.coupon_code,
      voucherId: bill.voucher_id,
      voucherCode: bill.voucher_code,
      voucherDiscountAmount: Number(bill.voucher_discount_amount || 0),
      pointsDiscountAmount: Number(bill.points_discount_amount || 0),
      awardedVoucherId: bill.awarded_voucher_id || null,
      awardedVoucherCode: bill.awarded_voucher_code || null,
      awardedVoucherAmount: Number(bill.awarded_voucher_amount || 0),
      awarded_voucher_code: bill.awarded_voucher_code || null,
      awarded_voucher_amount: Number(bill.awarded_voucher_amount || 0),
      awardedVoucher: bill.awarded_voucher_code ? {
        id: bill.awarded_voucher_id,
        code: bill.awarded_voucher_code,
        amount: Number(bill.awarded_voucher_amount || 0),
      } : null,
      pointsEarned: bill.points_earned,
      pointsRedeemed: bill.points_redeemed,
      pointsDiscountAmount: Number(bill.points_discount_amount || 0),
      tax: Number(bill.tax),
      total: Number(bill.total),
      lineItems: (bill.lineItems || []).map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        ...costs.saleSnapshot(li),
        staffAssigned: li.staff_assigned,
        staffIds: li.staff_ids,
        staff_assigned: li.staff_assigned,
        productConsumption: li.product_consumption,
        product_consumption: li.product_consumption,
        includedServices: li.included_services,
      })),
      payments: (bill.payments || []).map((p) => ({
        id: p.id,
        totalAmount: Number(p.total_amount),
        status: p.status,
        transactionReference: p.transaction_reference || '',
        notes: p.notes || '',
        paymentDate: p.payment_date,
        details: (p.details || []).map((d) => ({
          id: d.id,
          paymentMode: d.payment_mode,
          amount: Number(d.amount),
          bankAccountId: d.bank_account_id || null,
        })),
      })),
    };

    const waFormat = req.body?.format || 'thermal';
    const waPaperWidth = req.body?.paperWidth || 48;
    const result = await sendBillWhatsAppReceipt(billData, {
      format: waFormat,
      paperWidth: waPaperWidth,
    });

    if (result.success) {
      return res.status(200).json({
        message: result.simulated ? result.message : 'WhatsApp bill receipt sent successfully.',
        recipient: result.recipient,
        result,
      });
    } else {
      return res.status(400).json({
        message: result.reason || result.error || 'Failed to send WhatsApp message.',
        result,
      });
    }
  } catch (err) {
    console.error('Error sending WhatsApp bill:', err);
    return res.status(500).json({ message: 'Server error sending WhatsApp bill receipt.' });
  }
};

module.exports = {
  getCatalog,
  checkout,
  getBills,
  getBillById,
  addBillPayment,
  updateBill,
  sendWhatsAppBill,
};

