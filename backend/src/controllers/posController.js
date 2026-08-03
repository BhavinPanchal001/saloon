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
    const outletIdNum = outletId ? parseInt(outletId, 10) : null;

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
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      tax,
      total,
      lineItems,
      paymentDetails,
      transactionReference,
      paymentNotes,
      bankAccountId,
      allowOutOfStockCheckout,
      couponId,
      couponCode,
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

    // Check outlet exists
    const outlet = await Outlet.findByPk(outletId, { transaction });
    if (!outlet) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Outlet not found.' });
    }

    // Fetch outlet inventory for stock validation
    const outletInventory = await OutletInventory.findAll({
      where: { outlet_id: outletId },
      include: [{ model: Product, include: [{ model: UnitMaster, as: 'unitMaster' }] }],
      transaction,
    });

    // Build stock lookup map (productId -> { currentStock, unitMaster })
    const stockMap = {};
    for (const inv of outletInventory) {
      stockMap[inv.product_id] = {
        currentStock: parseFloat(inv.current_stock),
        unitMaster: inv.Product?.unitMaster,
      };
    }

    // Fetch services for package consumption validation
    const serviceIds = new Set();
    for (const item of lineItems) {
      if (item.itemType === 'package' && item.includedServices?.length > 0) {
        for (const svc of item.includedServices) {
          serviceIds.add(svc.serviceId);
        }
      }
    }

    const servicesMap = {};
    if (serviceIds.size > 0) {
      const services = await Service.findAll({
        where: { id: Array.from(serviceIds) },
        transaction,
      });
      for (const s of services) {
        servicesMap[s.id] = s;
      }
    }

    // Validate stock for all items
    const stockErrors = [];

    for (const item of lineItems) {
      // 1. Direct product sales
      if (item.itemType === 'product') {
        const stockInfo = stockMap[item.itemId];
        if (!stockInfo || stockInfo.currentStock < item.qty) {
          stockErrors.push({
            itemName: item.itemName,
            type: 'product',
            required: item.qty,
            available: stockInfo?.currentStock || 0,
            shortfall: item.qty - (stockInfo?.currentStock || 0),
          });
        }
      }

      // 2. Service product consumptions
      if (item.itemType === 'service' && item.productConsumption?.length > 0) {
        for (const consumption of item.productConsumption) {
          const stockInfo = stockMap[consumption.productId];
          const totalNeeded = consumption.qty;
          if (!stockInfo || stockInfo.currentStock < totalNeeded) {
            stockErrors.push({
              itemName: `${item.itemName} → Product #${consumption.productId}`,
              type: 'service-consumption',
              required: totalNeeded,
              available: stockInfo?.currentStock || 0,
              shortfall: totalNeeded - (stockInfo?.currentStock || 0),
            });
          }
        }
      }

      // 3. Package service consumptions — use frontend-sent productConsumption per service
      if (item.itemType === 'package' && item.includedServices?.length > 0) {
        for (const svcItem of item.includedServices) {
          if (!svcItem.productConsumption?.length) continue;

          for (const consumption of svcItem.productConsumption) {
            const stockInfo = stockMap[consumption.productId];
            const totalNeeded = Number(consumption.qty);
            if (!stockInfo || stockInfo.currentStock < totalNeeded) {
              stockErrors.push({
                itemName: `${item.itemName} → ${svcItem.serviceName} → Product #${consumption.productId}`,
                type: 'package-consumption',
                required: totalNeeded,
                available: stockInfo?.currentStock || 0,
                shortfall: totalNeeded - (stockInfo?.currentStock || 0),
              });
            }
          }
        }
      }
    }

    // If any stock errors and out-of-stock checkout is NOT allowed, reject the checkout
    if (stockErrors.length > 0 && !allowOutOfStockCheckout) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Insufficient stock for ${stockErrors.length} item(s). Out-of-stock checkout is disabled in Settings.`,
        stockErrors,
      });
    }

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
        outlet_id: outletId,
        customer_id: targetCustomer?.id || null,
        customer_name: customer?.name || targetCustomer?.name || null,
        customer_phone: customer?.phone || targetCustomer?.phone || null,
        payment_method: effectivePaymentMethod,
        bank_id: bankId || null,
        subtotal: subtotal || 0,
        discount_type: discountType || null,
        discount_value: discountValue || 0,
        discount_amount: discountAmount || 0,
        tax: tax || 0,
        total: total || 0,
        status: billStatus,
        coupon_id: couponId || null,
        coupon_code: couponCode || null,
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

    // Create line items
    const lineItemRecords = lineItems.map((item) => ({
      bill_id: bill.id,
      item_id: item.itemId,
      item_type: item.itemType,
      item_name: item.itemName,
      qty: item.qty,
      price: item.price,
      staff_assigned: item.staffAssigned || null,
      product_consumption: item.itemType === 'product' ? { unit: item.unit, abbr: item.unitAbbr } : (item.productConsumption || null),
      included_services: item.includedServices || null,
    }));

    await BillLineItem.bulkCreate(lineItemRecords, { transaction });

    // Deduct stock for product consumption from services
    for (const item of lineItems) {
      if (item.itemType === 'service' && item.productConsumption && item.productConsumption.length > 0) {
        for (const consumption of item.productConsumption) {
          const product = await Product.findByPk(consumption.productId, {
            include: [{ model: UnitMaster, as: 'unitMaster' }],
            transaction,
          });

          if (!product) continue;

          // Convert consumption to base unit
          const consumptionUnit = consumption.unit || 'primary';
          const baseDeduction = convertToBase(
            consumption.qty,
            product.unitMaster?.conversion_ratio,
            consumptionUnit
          );

          // Find outlet inventory
          const invRecord = await OutletInventory.findOne({
            where: { outlet_id: outletId, product_id: consumption.productId },
            transaction,
          });

          if (invRecord) {
            const currentStock = parseFloat(invRecord.current_stock);
            const newStock = currentStock - baseDeduction;
            await invRecord.update({ current_stock: newStock }, { transaction });
          }
        }
      }
    }

    // Deduct stock for direct product sales
    for (const item of lineItems) {
      if (item.itemType === 'product') {
        const product = await Product.findByPk(item.itemId, {
          include: [{ model: UnitMaster, as: 'unitMaster' }],
          transaction,
        });

        const unit = item.unit || 'primary';
        const deduction = product && product.unitMaster
          ? convertToBase(Number(item.qty), Number(product.unitMaster.conversion_ratio), unit)
          : Number(item.qty);

        const invRecord = await OutletInventory.findOne({
          where: { outlet_id: outletId, product_id: item.itemId },
          transaction,
        });

        if (invRecord) {
          const currentStock = parseFloat(invRecord.current_stock);
          const newStock = currentStock - deduction;
          await invRecord.update({ current_stock: newStock }, { transaction });
        }
      }
    }

    // Deduct stock for package service consumptions — use frontend-sent productConsumption
    for (const item of lineItems) {
      if (item.itemType === 'package' && item.includedServices?.length > 0) {
        for (const svcItem of item.includedServices) {
          if (!svcItem.productConsumption?.length) continue;

          for (const consumption of svcItem.productConsumption) {
            const product = await Product.findByPk(consumption.productId, {
              include: [{ model: UnitMaster, as: 'unitMaster' }],
              transaction,
            });

            if (!product) continue;

            const consumptionUnit = consumption.unit || 'primary';
            const baseDeduction = convertToBase(
              Number(consumption.qty),
              product.unitMaster?.conversion_ratio,
              consumptionUnit
            );

            const invRecord = await OutletInventory.findOne({
              where: { outlet_id: outletId, product_id: consumption.productId },
              transaction,
            });

            if (invRecord) {
              const currentStock = parseFloat(invRecord.current_stock);
              const newStock = currentStock - baseDeduction;
              await invRecord.update({ current_stock: newStock }, { transaction });
            }
          }
        }
      }
    }

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
      }, { transaction });

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
      tax: Number(completeBill.tax),
      total: Number(completeBill.total),
      lineItems: completeBill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        staffAssigned: li.staff_assigned,
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

    // Fire-and-forget: send Meta WhatsApp bill receipt if enabled in settings / request payload
    const shouldSendWhatsApp = req.body.sendWhatsApp !== undefined ? Boolean(req.body.sendWhatsApp) : true;
    if (shouldSendWhatsApp) {
      sendBillWhatsAppReceipt(response).catch((waErr) => {
        console.warn('[Checkout] WhatsApp receipt failed (non-blocking):', waErr.message);
      });
    } else {
      console.log('[Checkout] WhatsApp auto-send skipped as per setting / request preference.');
    }


    return res.status(201).json(response);
  } catch (err) {
    await transaction.rollback();
    console.error('Error during checkout:', err);
    return res.status(500).json({ message: 'Server error during checkout.' });
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
      tax: Number(bill.tax),
      total: Number(bill.total),
      lineItems: bill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        staffAssigned: li.staff_assigned,
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
      tax: Number(bill.tax),
      total: Number(bill.total),
      lineItems: bill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        staffAssigned: li.staff_assigned,
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
      tax: Number(completeBill.tax),
      total: Number(completeBill.total),
      lineItems: completeBill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        staffAssigned: li.staff_assigned,
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

    // 2. Process Line Items update if provided
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      // Step A: Restore inventory for existing line items
      for (const oldItem of bill.lineItems) {
        if (oldItem.item_type === 'product') {
          const product = await Product.findByPk(oldItem.item_id, {
            include: [{ model: UnitMaster, as: 'unitMaster' }],
            transaction,
          });
          const unit = oldItem.product_consumption?.unit || 'primary';
          const restoration = product && product.unitMaster
            ? convertToBase(Number(oldItem.qty), Number(product.unitMaster.conversion_ratio), unit)
            : Number(oldItem.qty);

          const invRecord = await OutletInventory.findOne({
            where: { outlet_id: outletId, product_id: oldItem.item_id },
            transaction,
          });
          if (invRecord) {
            const currentStock = parseFloat(invRecord.current_stock);
            await invRecord.update({ current_stock: currentStock + restoration }, { transaction });
          }
        } else if (oldItem.item_type === 'service' && oldItem.product_consumption?.length > 0) {
          for (const consumption of oldItem.product_consumption) {
            const product = await Product.findByPk(consumption.productId, {
              include: [{ model: UnitMaster, as: 'unitMaster' }],
              transaction,
            });
            if (!product) continue;
            const consumptionUnit = consumption.unit || 'primary';
            const baseRestoration = convertToBase(
              Number(consumption.qty),
              product.unitMaster?.conversion_ratio,
              consumptionUnit
            );
            const invRecord = await OutletInventory.findOne({
              where: { outlet_id: outletId, product_id: consumption.productId },
              transaction,
            });
            if (invRecord) {
              const currentStock = parseFloat(invRecord.current_stock);
              await invRecord.update({ current_stock: currentStock + baseRestoration }, { transaction });
            }
          }
        } else if (oldItem.item_type === 'package' && oldItem.included_services?.length > 0) {
          for (const svcItem of oldItem.included_services) {
            if (!svcItem.productConsumption?.length) continue;
            for (const consumption of svcItem.productConsumption) {
              const product = await Product.findByPk(consumption.productId, {
                include: [{ model: UnitMaster, as: 'unitMaster' }],
                transaction,
              });
              if (!product) continue;
              const consumptionUnit = consumption.unit || 'primary';
              const baseRestoration = convertToBase(
                Number(consumption.qty),
                product.unitMaster?.conversion_ratio,
                consumptionUnit
              );
              const invRecord = await OutletInventory.findOne({
                where: { outlet_id: outletId, product_id: consumption.productId },
                transaction,
              });
              if (invRecord) {
                const currentStock = parseFloat(invRecord.current_stock);
                await invRecord.update({ current_stock: currentStock + baseRestoration }, { transaction });
              }
            }
          }
        }
      }

      // Step B: Delete old line items
      await BillLineItem.destroy({ where: { bill_id: bill.id }, transaction });

      // Step C: Create new line items
      const lineItemRecords = lineItems.map((item) => ({
        bill_id: bill.id,
        item_id: item.itemId || item.id,
        item_type: item.itemType || 'service',
        item_name: item.itemName,
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0,
        staff_assigned: item.staffAssigned || null,
        product_consumption: item.itemType === 'product' ? { unit: item.unit, abbr: item.unitAbbr } : (item.productConsumption || null),
        included_services: item.includedServices || null,
      }));
      await BillLineItem.bulkCreate(lineItemRecords, { transaction });

      // Step D: Deduct inventory for new line items
      for (const item of lineItems) {
        if (item.itemType === 'service' && item.productConsumption?.length > 0) {
          for (const consumption of item.productConsumption) {
            const product = await Product.findByPk(consumption.productId, {
              include: [{ model: UnitMaster, as: 'unitMaster' }],
              transaction,
            });
            if (!product) continue;
            const consumptionUnit = consumption.unit || 'primary';
            const baseDeduction = convertToBase(
              Number(consumption.qty),
              product.unitMaster?.conversion_ratio,
              consumptionUnit
            );
            const invRecord = await OutletInventory.findOne({
              where: { outlet_id: outletId, product_id: consumption.productId },
              transaction,
            });
            if (invRecord) {
              const currentStock = parseFloat(invRecord.current_stock);
              await invRecord.update({ current_stock: currentStock - baseDeduction }, { transaction });
            }
          }
        } else if (item.itemType === 'product') {
          const product = await Product.findByPk(item.itemId || item.id, {
            include: [{ model: UnitMaster, as: 'unitMaster' }],
            transaction,
          });
          const unit = item.unit || 'primary';
          const deduction = product && product.unitMaster
            ? convertToBase(Number(item.qty), Number(product.unitMaster.conversion_ratio), unit)
            : Number(item.qty);

          const invRecord = await OutletInventory.findOne({
            where: { outlet_id: outletId, product_id: item.itemId || item.id },
            transaction,
          });
          if (invRecord) {
            const currentStock = parseFloat(invRecord.current_stock);
            await invRecord.update({ current_stock: currentStock - deduction }, { transaction });
          }
        } else if (item.itemType === 'package' && item.includedServices?.length > 0) {
          for (const svcItem of item.includedServices) {
            if (!svcItem.productConsumption?.length) continue;
            for (const consumption of svcItem.productConsumption) {
              const product = await Product.findByPk(consumption.productId, {
                include: [{ model: UnitMaster, as: 'unitMaster' }],
                transaction,
              });
              if (!product) continue;
              const consumptionUnit = consumption.unit || 'primary';
              const baseDeduction = convertToBase(
                Number(consumption.qty),
                product.unitMaster?.conversion_ratio,
                consumptionUnit
              );
              const invRecord = await OutletInventory.findOne({
                where: { outlet_id: outletId, product_id: consumption.productId },
                transaction,
              });
              if (invRecord) {
                const currentStock = parseFloat(invRecord.current_stock);
                await invRecord.update({ current_stock: currentStock - baseDeduction }, { transaction });
              }
            }
          }
        }
      }
    }

    // 3. Update totals & discounts
    const calculatedSubtotal = subtotal !== undefined
      ? Number(subtotal)
      : (Array.isArray(lineItems) ? lineItems.reduce((s, item) => s + (Number(item.qty) * Number(item.price)), 0) : Number(bill.subtotal));

    const calcDiscountType = discountType !== undefined ? discountType : bill.discount_type;
    const calcDiscountValue = discountValue !== undefined ? Number(discountValue) : Number(bill.discount_value);

    let calcDiscountAmount = 0;
    if (discountAmount !== undefined) {
      calcDiscountAmount = Number(discountAmount);
    } else if (calcDiscountType === 'fixed') {
      calcDiscountAmount = Math.min(calculatedSubtotal, calcDiscountValue);
    } else if (calcDiscountType === 'percent' || calcDiscountType === 'percentage') {
      calcDiscountAmount = (calculatedSubtotal * calcDiscountValue) / 100;
    }

    const calculatedTax = tax !== undefined ? Number(tax) : Number(bill.tax);
    const calculatedTotal = total !== undefined
      ? Number(total)
      : Math.max(0, calculatedSubtotal - calcDiscountAmount + calculatedTax);

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
      discount_type: calcDiscountType || null,
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
      tax: Number(completeBill.tax),
      total: Number(completeBill.total),
      lineItems: completeBill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
        staffAssigned: li.staff_assigned,
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
    await transaction.rollback();
    console.error('Error updating invoice:', err);
    return res.status(500).json({ message: 'Server error updating invoice.' });
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
      tax: Number(bill.tax),
      total: Number(bill.total),
      lineItems: bill.lineItems.map((li) => ({
        id: li.id,
        itemId: li.item_id,
        itemType: li.item_type,
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
      })),
    };

    const result = await sendBillWhatsAppReceipt(billData);

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

