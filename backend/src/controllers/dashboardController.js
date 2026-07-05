const { Op } = require('sequelize');
const {
  Outlet,
  Staff,
  Service,
  Package,
  Bill,
  BillLineItem,
  MonthlyBudget,
  OutletServicePrice,
  OutletPackagePrice,
} = require('../models');

const getDashboardSummary = async (req, res) => {
  try {
    const { outletId } = req.query;

    const isOutletFiltered = outletId && outletId !== 'all' && outletId !== 'undefined';
    const targetOutletId = isOutletFiltered
      ? (!isNaN(Number(outletId)) ? Number(outletId) : outletId)
      : null;

    // 1. Stat Row Counts
    // Active Outlets is a global system metric showing total active outlets in the organization
    const activeOutlets = await Outlet.count({ where: { status: 'active' } });

    // Staff count for target outlet (or total if 'all' selected)
    const staffWhere = isOutletFiltered ? { assigned_outlet_id: targetOutletId } : {};
    const staffCount = await Staff.count({ where: staffWhere });

    // Catalog live services and packages count
    const serviceCount = await Service.count({ where: { status: 'active' } });
    const packageCount = await Package.count({ where: { status: 'active' } });

    // Monthly Budget for target outlet (or total if 'all' selected)
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budgetWhere = { month_key: currentMonthKey };
    if (isOutletFiltered) {
      budgetWhere.outlet_id = targetOutletId;
    }
    const budgets = await MonthlyBudget.findAll({ where: budgetWhere });
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    // 2. Load Completed / Paid Bills strictly filtered by target outlet
    const billWhere = {
      status: { [Op.in]: ['paid', 'completed'] },
    };
    if (isOutletFiltered) {
      billWhere.outlet_id = targetOutletId;
    }

    const allBills = await Bill.findAll({
      where: billWhere,
      include: [{ model: BillLineItem, as: 'lineItems' }],
      order: [['created_at', 'DESC']],
    });

    // Summary Card Calculations for target outlet
    const totalRevenue = allBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
    const totalBills = allBills.length;
    const avgBillValue = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;

    let totalServices = 0;
    allBills.forEach((b) => {
      (b.lineItems || []).forEach((item) => {
        if (item.item_type === 'service') {
          totalServices += item.qty || 1;
        }
      });
    });

    const customerSet = new Set();
    allBills.forEach((b) => {
      const identifier = (b.customer_phone || b.customer_name || '').trim().toLowerCase();
      if (identifier) {
        customerSet.add(identifier);
      }
    });
    const customerCount = customerSet.size;

    // Date boundaries for growth calculations
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const currentMonthBills = allBills.filter((b) => {
      const d = new Date(b.createdAt || b.created_at);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });

    const previousMonthBills = allBills.filter((b) => {
      const d = new Date(b.createdAt || b.created_at);
      return d >= previousMonthStart && d <= previousMonthEnd;
    });

    const currMonthRevenue = currentMonthBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
    const prevMonthRevenue = previousMonthBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
    const revenueGrowth = prevMonthRevenue > 0
      ? parseFloat((((currMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1))
      : (currMonthRevenue > 0 ? 100.0 : 0.0);

    let currMonthServices = 0;
    currentMonthBills.forEach((b) => {
      (b.lineItems || []).forEach((item) => {
        if (item.item_type === 'service') currMonthServices += item.qty || 1;
      });
    });

    let prevMonthServices = 0;
    previousMonthBills.forEach((b) => {
      (b.lineItems || []).forEach((item) => {
        if (item.item_type === 'service') prevMonthServices += item.qty || 1;
      });
    });

    const serviceGrowth = prevMonthServices > 0
      ? parseFloat((((currMonthServices - prevMonthServices) / prevMonthServices) * 100).toFixed(1))
      : (currMonthServices > 0 ? 100.0 : 0.0);

    let newCustomers = 0;
    customerSet.forEach((custIdent) => {
      const hasPriorBill = allBills.some((b) => {
        const d = new Date(b.createdAt || b.created_at);
        const ident = (b.customer_phone || b.customer_name || '').trim().toLowerCase();
        return ident === custIdent && d < currentMonthStart;
      });
      if (!hasPriorBill) {
        newCustomers++;
      }
    });

    // 3. Weekly Revenue Chart Data (Current Week Mon-Sun)
    const daysName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const curr = new Date();
    const dayOfWeek = curr.getDay();
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMon);
    monday.setHours(0, 0, 0, 0);

    const weeklyChartData = daysName.map((dayName, index) => {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRevenue = allBills
        .filter((b) => {
          const d = new Date(b.createdAt || b.created_at);
          return d >= dayStart && d <= dayEnd;
        })
        .reduce((sum, b) => sum + Number(b.total || 0), 0);

      return { day: dayName, revenue: dayRevenue };
    });

    // 4. Today's Orders
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayBills = allBills.filter((b) => {
      const d = new Date(b.createdAt || b.created_at);
      return d >= todayStart && d <= todayEnd;
    });

    const todayCount = todayBills.length;
    const todayRevenue = todayBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
    const recentBills = allBills.slice(0, 5).map((b) => ({
      id: b.id,
      billNumber: b.bill_number,
      customer: b.customer_name,
      total: Number(b.total),
      paymentMethod: b.payment_method,
      status: b.status,
    }));

    // 5. Line Item Aggregations (filtered by target outlet)
    const serviceMap = {};
    const staffMap = {};
    const packageMap = {};

    allBills.forEach((b) => {
      (b.lineItems || []).forEach((item) => {
        const itemRev = Number(item.price || 0) * (item.qty || 1);
        const itemQty = item.qty || 1;

        if (item.item_type === 'service') {
          const name = item.item_name || 'Unknown Service';
          if (!serviceMap[name]) serviceMap[name] = { name, count: 0, revenue: 0 };
          serviceMap[name].count += itemQty;
          serviceMap[name].revenue += itemRev;
        } else if (item.item_type === 'package') {
          const name = item.item_name || 'Unknown Package';
          if (!packageMap[name]) packageMap[name] = { name, sold: 0, revenue: 0 };
          packageMap[name].sold += itemQty;
          packageMap[name].revenue += itemRev;
        }

        if (item.staff_assigned) {
          const staffName = item.staff_assigned;
          if (!staffMap[staffName]) staffMap[staffName] = { name: staffName, services: 0, revenue: 0, rating: 5.0 };
          staffMap[staffName].services += itemQty;
          staffMap[staffName].revenue += itemRev;
        }
      });
    });

    const servicePerformance = Object.values(serviceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((s) => ({ ...s, growth: 0 }));

    const staffPerformance = Object.values(staffMap)
      .sort((a, b) => b.revenue - a.revenue);

    const packageSales = Object.values(packageMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => ({ ...p, trend: 'up' }));

    return res.json({
      metrics: {
        activeOutlets,
        staffCount,
        serviceCount,
        packageCount,
        totalBudget,
      },
      summary: {
        totalRevenue,
        revenueGrowth,
        totalServices,
        serviceGrowth,
        avgBillValue,
        customerCount,
        newCustomers,
      },
      revenueChart: weeklyChartData,
      todayOrders: {
        todayCount,
        todayRevenue,
        recentBills,
      },
      servicePerformance,
      staffPerformance,
      packageSales,
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({ message: 'Server error fetching dashboard summary.' });
  }
};

module.exports = { getDashboardSummary };
