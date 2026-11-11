const { csvCell } = require("../utils/csvCell");
const { getProfitData } = require("../services/profitReportService");
const { InventoryLot, OutletProductPrice } = require("../models");
const Decimal = require("decimal.js");
const {
  Bill,
  BillLineItem,
  Expense,
  Payment,
  PaymentDetail,
  OutletInventory,
  Product,
  Outlet,
  Customer,
  PurchaseOrder,
  PurchaseOrderItem,
  Staff,
  Attendance,
  UnitMaster,
  Role,
} = require('../models');
const { Op, fn, col } = require('sequelize');
const { generateReportPDFBuffer } = require('../services/pdfService');

// GET /api/reports/shift-end?outletId=&date=
const getShiftEndReport = async (req, res) => {
  try {
    const { outletId, date } = req.query;
    if (!outletId) {
      return res.status(400).json({ message: 'outletId is required.' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    // Fetch all non-cancelled bills for outlet on target date
    const bills = await Bill.findAll({
      where: {
        outlet_id: outletId,
        status: { [Op.ne]: 'cancelled' },
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      include: [
        {
          model: Payment,
          as: 'payments',
          include: [{ model: PaymentDetail, as: 'details' }],
        },
      ],
    });

    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let totalNetSales = 0;
    const paymentBreakdown = { Cash: 0, Card: 0, UPI: 0, 'Store Credit': 0, Split: 0, Unpaid: 0 };

    const modeKeyMap = { cash: 'Cash', card: 'Card', upi: 'UPI', store_credit: 'Store Credit', bank_transfer: 'Card', cheque: 'Card' };

    bills.forEach((bill) => {
      totalGrossSales += Number(bill.subtotal || 0);
      totalDiscounts += Number(bill.discount_amount || 0);
      totalTax += Number(bill.tax || 0);
      totalNetSales += Number(bill.total || 0);

      let billPaidTotal = 0;
      (bill.payments || []).forEach((p) => {
        (p.details || []).forEach((d) => {
          const amt = Number(d.amount || 0);
          billPaidTotal += amt;
          const modeKey = modeKeyMap[(d.payment_mode || '').toLowerCase()] || 'Cash';
          if (paymentBreakdown[modeKey] !== undefined) {
            paymentBreakdown[modeKey] += amt;
          }
        });
      });

      if (billPaidTotal === 0 && (bill.status === 'paid' || bill.status === 'completed')) {
        const modeKey = modeKeyMap[(bill.payment_method || '').toLowerCase()] || 'Cash';
        if (paymentBreakdown[modeKey] !== undefined) {
          paymentBreakdown[modeKey] += Number(bill.total || 0);
        } else {
          paymentBreakdown.Cash += Number(bill.total || 0);
        }
      } else if (billPaidTotal < Number(bill.total || 0)) {
        paymentBreakdown.Unpaid += Number(bill.total || 0) - billPaidTotal;
      }
    });

    // Fetch cash expenses paid on this date for this outlet
    const expenses = await Expense.findAll({
      where: {
        outlet_id: outletId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
      },
    });

    const totalCashExpenses = expenses.reduce((acc, exp) => acc + Number(exp.total_amount || 0), 0);

    return res.json({
      date: targetDate,
      outletId: Number(outletId),
      totalBillsCount: bills.length,
      totalGrossSales,
      totalDiscounts,
      totalTax,
      totalNetSales,
      paymentBreakdown,
      totalCashExpenses,
      expectedCashInDrawer: paymentBreakdown.Cash - totalCashExpenses,
    });
  } catch (err) {
    console.error('Error generating shift end report:', err);
    return res.status(500).json({ message: 'Server error generating shift end report.' });
  }
};

// GET /api/reports/profit-loss?outletId=&startDate=&endDate=
const getProfitAndLossReport = async (req, res) => {
  try {
    return res.json(await getProfitData(req.query));
  } catch (err) {
    console.error('Error generating profit and loss report:', err);
    return res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error generating P&L report.' });
  }
};

// GET /api/reports/customer-credit
const getCustomerCreditReport = async (req, res) => {
  try {
    const { Customer } = require('../models');
    const customers = await Customer.findAll({
      attributes: ['id', 'name', 'phone', 'email', 'credit_balance', 'updatedAt'],
      order: [['credit_balance', 'ASC']],
    });

    let totalStoreCredit = 0;
    let totalOutstandingDues = 0;
    let customersWithCreditCount = 0;
    let customersWithDueCount = 0;

    const customersWithBalance = customers.filter((c) => {
      const bal = Number(c.credit_balance || 0);
      if (bal > 0) {
        totalStoreCredit += bal;
        customersWithCreditCount++;
        return true;
      } else if (bal < 0) {
        totalOutstandingDues += Math.abs(bal);
        customersWithDueCount++;
        return true;
      }
      return false;
    });

    return res.json({
      totalStoreCredit,
      totalOutstandingDues,
      customersWithCreditCount,
      customersWithDueCount,
      customers: customersWithBalance.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        creditBalance: Number(c.credit_balance || 0),
        status: Number(c.credit_balance) > 0 ? 'Store Credit' : 'Outstanding Due',
      })),
    });
  } catch (err) {
    console.error('Error generating customer credit report:', err);
    return res.status(500).json({ message: 'Server error generating customer credit report.' });
  }
};

// Helper for fetching GST report data
const getGstReportData = async ({ outletId, startDate, endDate }) => {
  const whereBill = { status: { [Op.in]: ['paid', 'completed'] } };
  if (outletId) {
    whereBill.outlet_id = outletId;
  }
  if (startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    whereBill.createdAt = { [Op.between]: [start, end] };
  }

  const bills = await Bill.findAll({
    where: whereBill,
    include: [{ model: Outlet, as: 'Outlet', attributes: ['id', 'name', 'code'] }],
    order: [['createdAt', 'DESC']],
  });

  let totalGrossSales = 0;
  let totalDiscounts = 0;
  let totalTaxableAmount = 0;
  let totalTax = 0;

  const itemizedBills = bills.map((b) => {
    const subtotal = Number(b.subtotal || 0);
    const discount = Number(b.discount_amount || 0);
    const taxable = Math.max(0, subtotal - discount);
    const tax = Number(b.tax || 0);
    const total = Number(b.total || 0);
    const cgst = tax / 2;
    const sgst = tax / 2;

    totalGrossSales += subtotal;
    totalDiscounts += discount;
    totalTaxableAmount += taxable;
    totalTax += tax;

    const dateStr = b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '';

    return {
      id: b.id,
      bill_number: b.bill_number,
      date: dateStr,
      outlet_name: b.Outlet?.name || 'Main Branch',
      customer_name: b.customer_name || 'Walk-in Guest',
      customer_phone: b.customer_phone || '',
      gross_subtotal: subtotal,
      discount_amount: discount,
      taxable_amount: taxable,
      cgst_amount: cgst,
      sgst_amount: sgst,
      total_tax: tax,
      total_amount: total,
      payment_method: b.payment_method || 'Cash',
    };
  });

  const totalCgst = totalTax / 2;
  const totalSgst = totalTax / 2;
  const totalNetRevenue = totalTaxableAmount + totalTax;

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    totalBillsCount: bills.length,
    totalGrossSales,
    totalDiscounts,
    totalTaxableAmount,
    totalCgst,
    totalSgst,
    totalTax,
    totalNetRevenue,
    bills: itemizedBills,
  };
};

// GET /api/reports/gst
const getGstReport = async (req, res) => {
  try {
    const { outletId, startDate, endDate } = req.query;
    const data = await getGstReportData({ outletId, startDate, endDate });
    return res.json(data);
  } catch (err) {
    console.error('Error generating GST report:', err);
    return res.status(500).json({ message: 'Server error generating GST report.' });
  }
};

// GET /api/reports/export-csv
const exportReportCSV = async (req, res) => {
  try {
    const { type, outletId, startDate, endDate, date } = req.query;
    let csvRows = [];
    let filename = `glowy_${type || 'report'}_${Date.now()}.csv`;

    if (type === 'gst') {
      const data = await getGstReportData({ outletId, startDate, endDate });
      csvRows.push([
        'Bill Number',
        'Date',
        'Outlet',
        'Customer Name',
        'Customer Phone',
        'Gross Subtotal',
        'Discount Amount',
        'Taxable Amount',
        'CGST (9%)',
        'SGST (9%)',
        'Total GST',
        'Net Total Amount',
        'Payment Method',
      ].join(','));

      (data.bills || []).forEach((b) => {
        csvRows.push([
          `"${b.bill_number}"`,
          `"${b.date}"`,
          `"${b.outlet_name}"`,
          `"${b.customer_name}"`,
          `"${b.customer_phone}"`,
          b.gross_subtotal.toFixed(2),
          b.discount_amount.toFixed(2),
          b.taxable_amount.toFixed(2),
          b.cgst_amount.toFixed(2),
          b.sgst_amount.toFixed(2),
          b.total_tax.toFixed(2),
          b.total_amount.toFixed(2),
          `"${b.payment_method}"`,
        ].join(','));
      });
    } else if (type === 'top-selling') {
      const data = await getTopSellingReportData({ outletId, startDate, endDate });
      csvRows.push(['Item Name', 'Item Type', 'Quantity Sold', 'Total Revenue (INR)'].join(','));
      (data.items || []).forEach((i) => {
        csvRows.push([`"${i.name}"`, `"${i.type}"`, i.qtySold, i.totalRevenue.toFixed(2)].join(','));
      });
    } else if (type === 'stock-summary') {
      const data = await getStockSummaryReportData({ outletId });
      csvRows.push(['Product Name', 'SKU', 'Category', 'Unit', 'Available Stock', 'Cost Price', 'Selling Price', 'Valuation (INR)'].join(','));
      (data.items || []).forEach((i) => {
        csvRows.push([`"${i.name}"`, `"${i.sku}"`, `"${i.category}"`, `"${i.unit}"`, i.currentStock, (i.costPrice === null ? 'Unknown' : i.costPrice.toFixed(2)), i.sellingPrice.toFixed(2), (i.totalValuation === null ? 'Unknown' : i.totalValuation.toFixed(2))].join(','));
      });
    } else if (type === 'low-stock') {
      const data = await getLowStockReportData({ outletId });
      csvRows.push(['Product Name', 'Category', 'Current Stock', 'Min Alert Stock', 'Shortage Qty', 'Selling Price (INR)'].join(','));
      (data.items || []).forEach((i) => {
        csvRows.push([`"${i.name}"`, `"${i.category}"`, i.currentStock, i.minStock, i.shortage, i.sellingPrice.toFixed(2)].join(','));
      });
    } else if (type === 'purchase-orders') {
      const data = await getPurchaseOrderReportData({ outletId, startDate, endDate });
      csvRows.push(['PO Number', 'Date', 'Vendor Name', 'Outlet', 'Status', 'Tax Amount', 'Total Amount (INR)'].join(','));
      (data.orders || []).forEach((o) => {
        csvRows.push([`"${o.poNumber}"`, `"${o.date}"`, `"${o.vendorName}"`, `"${o.outletName}"`, `"${o.status}"`, o.taxAmount.toFixed(2), o.totalAmount.toFixed(2)].join(','));
      });
    } else if (type === 'attendance' || type === 'employee-attendance') {
      const data = await getEmployeeAttendanceReportData({ outletId, startDate, endDate });
      csvRows.push(['Employee Name', 'Emp Code', 'Role', 'Total Days', 'Present', 'Absent', 'Half Day', 'Leave'].join(','));
      (data.staffSummary || []).forEach((s) => {
        csvRows.push([`"${s.name}"`, `"${s.employeeCode}"`, `"${s.role}"`, s.totalRecordedDays, s.present, s.absent, s.halfDay, s.leave].join(','));
      });
    } else if (type === 'gstr2') {
      const data = await getGstr2ReportData({ outletId, startDate, endDate });
      csvRows.push(['PO Number', 'Date', 'Vendor Name', 'Vendor GSTIN', 'Taxable Value', 'CGST', 'SGST', 'Total GST (ITC)', 'Total PO Amount (INR)'].join(','));
      (data.purchases || []).forEach((p) => {
        csvRows.push([`"${p.poNumber}"`, `"${p.date}"`, `"${p.vendorName}"`, `"${p.vendorGstin}"`, p.taxableValue.toFixed(2), p.cgst.toFixed(2), p.sgst.toFixed(2), p.totalTax.toFixed(2), p.totalAmount.toFixed(2)].join(','));
      });
    } else if (type === 'shift') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
      const bills = await Bill.findAll({
        where: { outlet_id: outletId, status: { [Op.ne]: 'cancelled' }, createdAt: { [Op.between]: [startOfDay, endOfDay] } },
      });
      const expenses = await Expense.findAll({
        where: { outlet_id: outletId, createdAt: { [Op.between]: [startOfDay, endOfDay] } },
      });

      let netSales = bills.reduce((acc, b) => acc + Number(b.total || 0), 0);
      let cashExp = expenses.reduce((acc, e) => acc + Number(e.total_amount || 0), 0);

      csvRows.push(['Shift Date', 'Total Bills', 'Net Sales Revenue', 'Cash Expenses', 'Expected Cash in Drawer'].join(','));
      csvRows.push([`"${targetDate}"`, bills.length, netSales.toFixed(2), cashExp.toFixed(2), (netSales - cashExp).toFixed(2)].join(','));
    } else if (type === 'pnl') {
      const data = await getProfitData({ outletId, startDate, endDate });
      csvRows.push(['Gross Revenue', 'Discounts', 'Net Revenue', 'Known COGS', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit', 'Unknown Cost Lines'].join(','));
      csvRows.push([data.grossRevenue, data.totalDiscount, data.netRevenue, data.knownCostOfGoodsSold, data.costOfGoodsSold ?? 'Unknown', data.grossProfit ?? 'Unknown', data.totalExpenses, data.netProfit ?? 'Unknown', data.unknownCostLines].join(','));
      csvRows.push('');
      csvRows.push(['Product', 'Barcode', 'Quantity', 'Net Sales', 'Cost', 'Gross Profit', 'Margin %'].join(','));
      const csv = csvCell;
      data.productProfits.forEach((item) => csvRows.push([csv(item.name), csv(item.barcode), item.qtySold, item.netRevenue, item.costTotal ?? 'Unknown', item.grossProfit ?? 'Unknown', item.marginPercent ?? 'Unknown'].join(',')));
    } else if (type === 'credit') {
      const customers = await Customer.findAll({
        attributes: ['id', 'name', 'phone', 'email', 'credit_balance'],
      });
      csvRows.push(['Customer Name', 'Phone', 'Email', 'Status', 'Credit Balance'].join(','));
      customers.forEach((c) => {
        const bal = Number(c.credit_balance || 0);
        if (bal !== 0) {
          csvRows.push([
            `"${c.name}"`,
            `"${c.phone}"`,
            `"${c.email || ''}"`,
            `"${bal > 0 ? 'Store Credit' : 'Outstanding Due'}"`,
            bal.toFixed(2),
          ].join(','));
        }
      });
    }

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Error exporting CSV report:', err);
    return res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error exporting CSV report.' });
  }
};

// GET /api/reports/export-pdf
const exportReportPDF = async (req, res) => {
  try {
    const { type, outletId, startDate, endDate, date } = req.query;

    let outletName = 'All Outlets';
    if (outletId) {
      const outlet = await Outlet.findByPk(outletId);
      if (outlet) outletName = outlet.name;
    }

    let reportData = {};

    if (type === 'gst') {
      reportData = await getGstReportData({ outletId, startDate, endDate });
    } else if (type === 'top-selling') {
      reportData = await getTopSellingReportData({ outletId, startDate, endDate });
    } else if (type === 'stock-summary') {
      reportData = await getStockSummaryReportData({ outletId });
    } else if (type === 'low-stock') {
      reportData = await getLowStockReportData({ outletId });
    } else if (type === 'purchase-orders') {
      reportData = await getPurchaseOrderReportData({ outletId, startDate, endDate });
    } else if (type === 'attendance' || type === 'employee-attendance') {
      reportData = await getEmployeeAttendanceReportData({ outletId, startDate, endDate });
    } else if (type === 'gstr2') {
      reportData = await getGstr2ReportData({ outletId, startDate, endDate });
    } else if (type === 'shift') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
      const bills = await Bill.findAll({
        where: { outlet_id: outletId, status: { [Op.ne]: 'cancelled' }, createdAt: { [Op.between]: [startOfDay, endOfDay] } },
        include: [{ model: Payment, as: 'payments', include: [{ model: PaymentDetail, as: 'details' }] }],
      });
      const expenses = await Expense.findAll({
        where: { outlet_id: outletId, createdAt: { [Op.between]: [startOfDay, endOfDay] } },
      });

      let totalNetSales = 0;
      const paymentBreakdown = { Cash: 0, Card: 0, UPI: 0, 'Store Credit': 0 };
      bills.forEach((b) => {
        totalNetSales += Number(b.total || 0);
        (b.payments || []).forEach((p) => {
          (p.details || []).forEach((d) => {
            const mode = d.payment_mode === 'upi' ? 'UPI' : d.payment_mode === 'card' ? 'Card' : 'Cash';
            paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + Number(d.amount || 0);
          });
        });
      });
      const totalCashExpenses = expenses.reduce((acc, e) => acc + Number(e.total_amount || 0), 0);

      reportData = {
        totalBillsCount: bills.length,
        totalNetSales,
        totalCashExpenses,
        expectedCashInDrawer: paymentBreakdown.Cash - totalCashExpenses,
        paymentBreakdown,
      };
    } else if (type === 'pnl') {
      reportData = await getProfitData({ outletId, startDate, endDate });
    } else if (type === 'credit') {
      const customers = await Customer.findAll({
        attributes: ['id', 'name', 'phone', 'email', 'credit_balance'],
      });
      let totalStoreCredit = 0;
      let totalOutstandingDues = 0;
      let customersWithCreditCount = 0;
      let customersWithDueCount = 0;

      const custs = customers
        .filter((c) => Number(c.credit_balance || 0) !== 0)
        .map((c) => {
          const bal = Number(c.credit_balance || 0);
          if (bal > 0) {
            totalStoreCredit += bal;
            customersWithCreditCount++;
          } else {
            totalOutstandingDues += Math.abs(bal);
            customersWithDueCount++;
          }
          return {
            name: c.name,
            phone: c.phone,
            status: bal > 0 ? 'Store Credit' : 'Outstanding Due',
            creditBalance: bal,
          };
        });

      reportData = {
        totalStoreCredit,
        totalOutstandingDues,
        customersWithCreditCount,
        customersWithDueCount,
        customers: custs,
      };
    }

    const pdfBuffer = generateReportPDFBuffer(type, reportData, { outletName, startDate, endDate, date });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="glowy_${type}_report_${Date.now()}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error exporting PDF report:', err);
    return res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error exporting PDF report.' });
  }
};

// Data generator for Top Selling Items Report (Services & Products)

const getTopSellingReportData = async ({ outletId, startDate, endDate }) => {
  const whereBill = { status: { [Op.in]: ['paid', 'completed'] } };
  if (outletId) whereBill.outlet_id = outletId;
  if (startDate && endDate) {
    whereBill.createdAt = { [Op.between]: [new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T23:59:59.999Z`)] };
  }

  const bills = await Bill.findAll({
    where: whereBill,
    include: [{ model: BillLineItem, as: 'lineItems' }],
  });

  const itemMap = {};
  bills.forEach((bill) => {
    (bill.lineItems || []).forEach((li) => {
      const key = `${li.item_type}_${li.item_id}_${li.item_name}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: li.item_name,
          type: li.item_type,
          qtySold: 0,
          totalRevenue: 0,
        };
      }
      const qty = Number(li.qty || 1);
      const price = Number(li.price || 0);
      itemMap[key].qtySold += qty;
      itemMap[key].totalRevenue += qty * price;
    });
  });

  const itemsList = Object.values(itemMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  const totalItemsCount = itemsList.length;
  const totalQuantitySold = itemsList.reduce((sum, item) => sum + item.qtySold, 0);
  const totalRevenue = itemsList.reduce((sum, item) => sum + item.totalRevenue, 0);

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    totalItemsCount,
    totalQuantitySold,
    totalRevenue,
    items: itemsList,
  };
};

// Data generator for Stock Summary Report
const getStockSummaryReportData = async ({ outletId }) => {
  const products = await Product.findAll({
    include: [
      { model: UnitMaster, as: 'unitMaster' },
      { model: OutletInventory, as: 'OutletInventories' },
    ],
  });

  let totalProducts = products.length;
  let totalStockQty = 0;
  let totalValuation = 0;

  const lots = await InventoryLot.findAll({ where: outletId ? { location_id: Number(outletId) } : {} });
  const outletPrices = outletId ? await OutletProductPrice.findAll({ where: { outlet_id: outletId } }) : [];
  let unknownCostProducts = 0;
  const items = products.map((p) => {
    const productLots = lots.filter((lot) => Number(lot.product_id) === Number(p.id));
    const stock = productLots.reduce((sum, lot) => sum.plus(lot.remaining_qty), new Decimal(0));
    const known = productLots.every((lot) => Number(lot.remaining_qty) === 0 || lot.unit_cost !== null);
    const value = productLots.reduce((sum, lot) => sum.plus(lot.unit_cost === null ? 0 : new Decimal(lot.remaining_qty).times(lot.unit_cost)), new Decimal(0));
    const itemValuation = known ? Number(value.toFixed(2)) : null;
    if (!known) unknownCostProducts++;
    totalStockQty += Number(stock);
    totalValuation += Number(value);
    return { id: p.id, name: p.item_name, sku: p.barcode || `PROD-${p.id}`, barcode: p.barcode,
      category: 'Product', unit: p.unitMaster?.primary_abbr || 'Pcs', currentStock: Number(stock),
      costPrice: known && stock.gt(0) ? Number(value.div(stock).toFixed(6)) : known ? 0 : null,
      sellingPrice: Number(outletPrices.find((price) => price.product_id === p.id)?.price ?? p.unit_price),
      totalValuation: itemValuation, knownValuation: Number(value.toFixed(2)) };
  });

  return {
    totalProducts,
    totalStockQty,
    totalValuation: unknownCostProducts ? null : Number(totalValuation.toFixed(2)),
    knownValuation: Number(totalValuation.toFixed(2)),
    unknownCostProducts,
    items,
  };
};

// Data generator for Low Stock Report
const getLowStockReportData = async ({ outletId }) => {
  const products = await Product.findAll({
    include: [{ model: OutletInventory, as: 'OutletInventories' }],
  });

  const lowStockItems = [];
  products.forEach((p) => {
    const minStock = 5;
    let currentStock = 0;
    const invList = p.OutletInventories || p.outlet_inventories || [];

    if (outletId) {
      const inv = invList.find((i) => String(i.outlet_id) === String(outletId));
      currentStock = inv ? Number(inv.current_stock || 0) : 0;
    } else {
      currentStock = invList.reduce((acc, i) => acc + Number(i.current_stock || 0), 0);
    }
    if (!outletId && currentStock === 0 && p.central_stock) {
      currentStock = Number(p.central_stock || 0);
    }

    if (currentStock <= minStock) {
      lowStockItems.push({
        id: p.id,
        name: p.item_name || 'Product',
        category: 'Product',
        currentStock,
        minStock,
        shortage: Math.max(0, minStock - currentStock),
        sellingPrice: Number(p.unit_price || 0),
      });
    }
  });

  return {
    lowStockCount: lowStockItems.length,
    items: lowStockItems,
  };
};

// Data generator for Purchase Order Report
const getPurchaseOrderReportData = async ({ outletId, startDate, endDate }) => {
  const wherePo = {};
  if (outletId) wherePo.outlet_id = outletId;
  if (startDate && endDate) {
    wherePo.createdAt = { [Op.between]: [new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T23:59:59.999Z`)] };
  }

  const pos = await PurchaseOrder.findAll({
    where: wherePo,
    include: [{ model: Outlet, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });

  let totalSpend = 0;
  let totalOrdersCount = pos.length;
  let pendingCount = 0;
  let receivedCount = 0;

  const orders = pos.map((po) => {
    const totalAmt = Number(po.total_cost || po.total_amount || 0);
    totalSpend += totalAmt;
    if (po.status === 'received' || po.status === 'completed') {
      receivedCount++;
    } else {
      pendingCount++;
    }

    return {
      id: po.id,
      poNumber: po.po_number || `PO-${po.id}`,
      vendorName: po.supplier_name || po.vendor_name || 'Vendor Supplier',
      outletName: po.Outlet?.name || 'Main Branch',
      date: po.createdAt ? new Date(po.createdAt).toISOString().split('T')[0] : '',
      status: po.status || 'pending',
      totalAmount: totalAmt,
      taxAmount: Number(po.tax_amount || 0),
    };
  });

  return {
    totalOrdersCount,
    totalSpend,
    pendingCount,
    receivedCount,
    orders,
  };
};

// Data generator for Employee Attendance Report
const getEmployeeAttendanceReportData = async ({ outletId, startDate, endDate }) => {
  const whereAtt = {};
  if (startDate && endDate) {
    whereAtt.date = { [Op.between]: [startDate, endDate] };
  }

  const whereStaff = {};
  if (outletId) {
    whereStaff.assigned_outlet_id = outletId;
  }

  const staffMembers = await Staff.findAll({
    where: whereStaff,
    attributes: ['id', 'first_name', 'last_name', 'employee_code', 'role_id', 'assigned_outlet_id'],
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });

  const attendances = await Attendance.findAll({ where: whereAtt });

  const staffSummary = staffMembers.map((s) => {
    const staffAtts = attendances.filter((a) => String(a.staff_id) === String(s.id));
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;

    staffAtts.forEach((a) => {
      const st = (a.status || '').toLowerCase();
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'half_day' || st === 'halfday') halfDay++;
      else if (st === 'paid_leave' || st === 'leave') leave++;
    });

    return {
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      employeeCode: s.employee_code || `EMP-${s.id}`,
      role: s.role?.name || 'Staff',
      totalRecordedDays: staffAtts.length,
      present,
      absent,
      halfDay,
      leave,
    };
  });

  return {
    totalEmployees: staffMembers.length,
    staffSummary,
  };
};


// Data generator for GSTR-2 Purchase ITC Report
const getGstr2ReportData = async ({ outletId, startDate, endDate }) => {
  const wherePo = { status: { [Op.in]: ['received', 'approved'] } };
  if (outletId) wherePo.outlet_id = outletId;
  if (startDate && endDate) {
    wherePo.createdAt = { [Op.between]: [new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T23:59:59.999Z`)] };
  }

  const pos = await PurchaseOrder.findAll({
    where: wherePo,
    include: [{ model: Outlet, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });

  let totalPurchaseValue = 0;
  let totalTaxableValue = 0;
  let totalItcClaimable = 0;

  const purchases = pos.map((po) => {
    const totalAmt = Number(po.total_cost || po.total_amount || 0);
    const taxAmt = Number(po.tax_amount || (totalAmt * 0.18) / 1.18);
    const taxableVal = Math.max(0, totalAmt - taxAmt);
    const cgst = taxAmt / 2;
    const sgst = taxAmt / 2;

    totalPurchaseValue += totalAmt;
    totalTaxableValue += taxableVal;
    totalItcClaimable += taxAmt;

    return {
      id: po.id,
      poNumber: po.po_number || `PO-${po.id}`,
      vendorName: po.supplier_name || po.vendor_name || 'Supplier Vendor',
      vendorGstin: po.supplier_phone || po.supplier_contact || po.vendor_gstin || '29AAACG9999F1Z1',
      date: po.createdAt ? new Date(po.createdAt).toISOString().split('T')[0] : '',
      taxableValue: taxableVal,
      cgst,
      sgst,
      totalTax: taxAmt,
      totalAmount: totalAmt,
    };
  });

  return {
    totalPurchaseOrders: pos.length,
    totalPurchaseValue,
    totalTaxableValue,
    totalItcClaimable,
    purchases,
  };
};

// Controller Endpoints
const getTopSellingReport = async (req, res) => {
  try {
    const data = await getTopSellingReportData(req.query);
    return res.json(data);
  } catch (err) {
    console.error('Error in getTopSellingReport:', err);
    return res.status(500).json({ message: 'Server error generating top selling report.' });
  }
};

const getStockSummaryReport = async (req, res) => {
  try {
    const data = await getStockSummaryReportData(req.query);
    return res.json(data);
  } catch (err) {
    console.error('Error in getStockSummaryReport:', err);
    return res.status(500).json({ message: 'Server error generating stock summary report.' });
  }
};

const getLowStockReport = async (req, res) => {
  try {
    const data = await getLowStockReportData(req.query);
    return res.json(data);
  } catch (err) {
    console.error('Error in getLowStockReport:', err);
    return res.status(500).json({ message: 'Server error generating low stock report.' });
  }
};

const getPurchaseOrderReport = async (req, res) => {
  try {
    const data = await getPurchaseOrderReportData(req.query);
    return res.json(data);
  } catch (err) {
    console.error('Error in getPurchaseOrderReport:', err);
    return res.status(500).json({ message: 'Server error generating purchase order report.' });
  }
};

const getEmployeeAttendanceReport = async (req, res) => {
  try {
    const data = await getEmployeeAttendanceReportData(req.query);
    return res.json(data);
  } catch (err) {
    console.error('Error in getEmployeeAttendanceReport:', err);
    return res.status(500).json({ message: 'Server error generating attendance report.' });
  }
};


const getGstr2Report = async (req, res) => {
  try {
    const data = await getGstr2ReportData(req.query);
    return res.json(data);
  } catch (err) {
    console.error('Error in getGstr2Report:', err);
    return res.status(500).json({ message: 'Server error generating GSTR-2 report.' });
  }
};

module.exports = {
  getShiftEndReport,
  getProfitAndLossReport,
  getCustomerCreditReport,
  getGstReport,
  getTopSellingReport,
  getStockSummaryReport,
  getLowStockReport,
  getPurchaseOrderReport,
  getEmployeeAttendanceReport,
  getGstr2Report,
  exportReportCSV,
  exportReportPDF,
};



