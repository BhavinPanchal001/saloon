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
} = require('../models');
const { printReceipt } = require('../utils/thermalPrinter');

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
        const assignedOutletIds = service.assigned_outlet_ids || [];
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
        const assignedOutletIds = pkg.assigned_outlet_ids || [];
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
      const stock = outletIdNum ? (inventoryMap[product.id] || 0) : Number(product.central_stock);

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
    } = req.body;

    // Validation
    if (!outletId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'outletId is required.' });
    }
    if (!paymentMethod || !['Cash', 'Card', 'UPI'].includes(paymentMethod)) {
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

    // Generate bill number
    const billNumber = await generateBillNumber(outletId, outlet.code);

    // Create bill
    const bill = await Bill.create(
      {
        bill_number: billNumber,
        outlet_id: outletId,
        customer_name: customer?.name || null,
        customer_phone: customer?.phone || null,
        payment_method: paymentMethod,
        bank_id: bankId || null,
        subtotal: subtotal || 0,
        discount_type: discountType || null,
        discount_value: discountValue || 0,
        discount_amount: discountAmount || 0,
        tax: tax || 0,
        total: total || 0,
        status: 'paid',
      },
      { transaction }
    );

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

    // Create Payment record linked to this bill
    const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
    const modeMap = { Cash: 'cash', Card: 'card', UPI: 'upi' };

    // Build payment detail rows: prefer split paymentDetails from frontend, else use single paymentMethod
    let detailRows = [];
    if (Array.isArray(paymentDetails) && paymentDetails.length > 0) {
      for (const d of paymentDetails) {
        const mode = d.paymentMode;
        if (!validModes.includes(mode)) continue;
        const amount = Math.max(0, Number(d.amount) || 0);
        if (amount > 0) detailRows.push({ payment_mode: mode, amount, bank_account_id: d.bankAccountId || null });
      }
    }
    if (detailRows.length === 0) {
      const singleMode = modeMap[paymentMethod] || 'cash';
      detailRows = [{ payment_mode: singleMode, amount: Number(total) || 0, bank_account_id: null }];
    }

    const totalPaid = detailRows.reduce((s, d) => s + d.amount, 0);

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
        status: 'completed',
        transaction_reference: (transactionReference || '').trim() || null,
        notes: (paymentNotes || '').trim() || null,
        payment_date: new Date().toISOString().split('T')[0],
        bank_account_id: primaryBankId,
      },
      { transaction }
    );

    await PaymentDetail.bulkCreate(
      detailRows.map((row) => ({ ...row, payment_id: createdPayment.id })),
      { transaction }
    );

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
    const user = req.user;

    // Build where clause
    const where = {};

    // If not admin, restrict to user's outlet
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
      if (user?.outlet_id) {
        where.outlet_id = user.outlet_id;
      }
    } else if (outletId) {
      where.outlet_id = outletId;
    }

    if (paymentMethod && ['Cash', 'Card', 'UPI'].includes(paymentMethod)) {
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
      customer: {
        name: bill.customer_name,
        phone: bill.customer_phone,
      },
      paymentMethod: bill.payment_method,
      outletId: bill.outlet_id,
      outletName: bill.Outlet?.name || 'Unknown',
      status: bill.status,
      subtotal: Number(bill.subtotal),
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

module.exports = {
  getCatalog,
  checkout,
  getBills,
  getBillById,
};
