const {
  Customer,
  Service,
  Product,
  Bill,
  Staff,
  Package,
  Appointment,
  Outlet,
  LoyaltyTier,
  ServiceCategory,
  Role,
} = require('../models');
const { Op } = require('sequelize');

/**
 * Global multi-entity search endpoint
 * GET /api/search?q=...&type=...&limit=...
 */
const globalSearch = async (req, res) => {
  try {
    const rawQuery = req.query.q || '';
    const query = rawQuery.trim();
    const type = (req.query.type || 'all').toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 20);
    const user = req.user || req.admin || {};
    const isPosUser = user.role === 'cashier' || user.role === 'pos';
    const userOutletId = user.outlet_id;

    if (!query || query.length < 2) {
      return res.json({
        query,
        totalCount: 0,
        results: {
          customers: [],
          services: [],
          products: [],
          bills: [],
          staff: [],
          packages: [],
          appointments: [],
          outlets: [],
        },
      });
    }

    const searchPattern = `%${query}%`;
    const tasks = [];
    const enabled = (cat) => type === 'all' || type === cat;

    // 1. Customers
    if (enabled('customers')) {
      tasks.push(
        Customer.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: searchPattern } },
              { phone: { [Op.like]: searchPattern } },
              { email: { [Op.like]: searchPattern } },
            ],
          },
          include: [{ model: LoyaltyTier, as: 'loyaltyTier', attributes: ['id', 'name', 'badge_color'] }],
          attributes: ['id', 'name', 'phone', 'email', 'gender', 'notes'],
          limit,
          order: [['updatedAt', 'DESC']],
        })
          .then((rows) => ({
            category: 'customers',
            items: rows.map((c) => ({
              id: c.id,
              title: c.name || 'Unnamed Customer',
              subtitle: c.phone || c.email || 'No contact info',
              category: 'customers',
              badge: c.loyaltyTier?.name || null,
              badgeColor: c.loyaltyTier?.badge_color || null,
              url: `/customers?search=${encodeURIComponent(c.phone || c.name || '')}`,
              metadata: {
                phone: c.phone,
                email: c.email,
              },
            })),
          }))
          .catch((err) => {
            console.error('Search error in customers:', err.message);
            return { category: 'customers', items: [] };
          })
      );
    }

    // 2. Services
    if (enabled('services')) {
      tasks.push(
        Service.findAll({
          where: {
            service_name: { [Op.like]: searchPattern },
          },
          include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name'] }],
          attributes: ['id', 'service_name', 'price', 'duration', 'status'],
          limit,
          order: [['service_name', 'ASC']],
        })
          .then((rows) => ({
            category: 'services',
            items: rows.map((s) => ({
              id: s.id,
              title: s.service_name,
              subtitle: `${s.category?.name || 'General'} • ${s.duration} mins`,
              category: 'services',
              badge: s.status,
              badgeColor: s.status === 'active' ? 'emerald' : 'slate',
              url: `/services/${s.id}`,
              metadata: {
                price: s.price,
                duration: s.duration,
                categoryName: s.category?.name,
              },
            })),
          }))
          .catch((err) => {
            console.error('Search error in services:', err.message);
            return { category: 'services', items: [] };
          })
      );
    }

    // 3. Products / Inventory
    if (enabled('products')) {
      tasks.push(
        Product.findAll({
          where: {
            item_name: { [Op.like]: searchPattern },
          },
          attributes: ['id', 'item_name', 'unit_price', 'central_stock', 'status'],
          limit,
          order: [['item_name', 'ASC']],
        })
          .then((rows) => ({
            category: 'products',
            items: rows.map((p) => ({
              id: p.id,
              title: p.item_name,
              subtitle: `Stock: ${Number(p.central_stock || 0).toFixed(0)} units`,
              category: 'products',
              badge: p.status,
              badgeColor: p.status === 'active' ? 'emerald' : 'slate',
              url: `/inventory/products/${p.id}/sales`,
              metadata: {
                unitPrice: p.unit_price,
                centralStock: p.central_stock,
              },
            })),
          }))
          .catch((err) => {
            console.error('Search error in products:', err.message);
            return { category: 'products', items: [] };
          })
      );
    }

    // 4. Bills / Invoices
    if (enabled('bills')) {
      const billWhere = {
        [Op.or]: [
          { bill_number: { [Op.like]: searchPattern } },
          { customer_name: { [Op.like]: searchPattern } },
          { customer_phone: { [Op.like]: searchPattern } },
        ],
      };

      // Restrict outlet for cashier if assigned
      if (isPosUser && userOutletId) {
        billWhere.outlet_id = userOutletId;
      }

      tasks.push(
        Bill.findAll({
          where: billWhere,
          attributes: ['id', 'bill_number', 'customer_name', 'customer_phone', 'grand_total', 'payment_method', 'createdAt', 'outlet_id'],
          limit,
          order: [['createdAt', 'DESC']],
        })
          .then((rows) => ({
            category: 'bills',
            items: rows.map((b) => ({
              id: b.id,
              title: b.bill_number || `Bill #${b.id}`,
              subtitle: `${b.customer_name || 'Walk-in'} • ${b.payment_method || 'Unpaid'}`,
              category: 'bills',
              badge: `₹${Number(b.grand_total || 0).toLocaleString('en-IN')}`,
              badgeColor: 'amber',
              url: `/pos/bills/${b.id}`,
              metadata: {
                grandTotal: b.grand_total,
                date: b.createdAt,
                customerPhone: b.customer_phone,
              },
            })),
          }))
          .catch((err) => {
            console.error('Search error in bills:', err.message);
            return { category: 'bills', items: [] };
          })
      );
    }

    // 5. Staff / Employees (Admins and managers only, or basic contact info for POS)
    if (enabled('staff') && !isPosUser) {
      tasks.push(
        Staff.findAll({
          where: {
            [Op.or]: [
              { first_name: { [Op.like]: searchPattern } },
              { last_name: { [Op.like]: searchPattern } },
              { phone: { [Op.like]: searchPattern } },
              { employee_code: { [Op.like]: searchPattern } },
              { personal_email: { [Op.like]: searchPattern } },
            ],
          },
          include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
          attributes: ['id', 'first_name', 'last_name', 'phone', 'employee_code', 'personal_email'],
          limit,
          order: [['first_name', 'ASC']],
        })
          .then((rows) => ({
            category: 'staff',
            items: rows.map((st) => {
              const fullName = [st.first_name, st.last_name].filter(Boolean).join(' ');
              return {
                id: st.id,
                title: fullName || 'Unnamed Staff',
                subtitle: `${st.role?.name || 'Staff'} • ${st.employee_code || st.phone || ''}`,
                category: 'staff',
                badge: st.role?.name || 'Employee',
                badgeColor: 'indigo',
                url: `/staff/${st.id}`,
                metadata: {
                  phone: st.phone,
                  email: st.personal_email,
                  code: st.employee_code,
                },
              };
            }),
          }))
          .catch((err) => {
            console.error('Search error in staff:', err.message);
            return { category: 'staff', items: [] };
          })
      );
    }

    // 6. Packages
    if (enabled('packages')) {
      tasks.push(
        Package.findAll({
          where: {
            [Op.or]: [
              { package_name: { [Op.like]: searchPattern } },
              { package_code: { [Op.like]: searchPattern } },
            ],
          },
          attributes: ['id', 'package_name', 'package_code', 'price', 'validity_days', 'status', 'category'],
          limit,
          order: [['package_name', 'ASC']],
        })
          .then((rows) => ({
            category: 'packages',
            items: rows.map((pkg) => ({
              id: pkg.id,
              title: pkg.package_name,
              subtitle: `Code: ${pkg.package_code} • ${pkg.validity_days || 30} days validity`,
              category: 'packages',
              badge: `₹${Number(pkg.price || 0).toLocaleString('en-IN')}`,
              badgeColor: 'gold',
              url: `/packages/${pkg.id}`,
              metadata: {
                price: pkg.price,
                code: pkg.package_code,
                category: pkg.category,
              },
            })),
          }))
          .catch((err) => {
            console.error('Search error in packages:', err.message);
            return { category: 'packages', items: [] };
          })
      );
    }

    // 7. Appointments
    if (enabled('appointments')) {
      const apptWhere = {
        [Op.or]: [
          { customer_name: { [Op.like]: searchPattern } },
          { customer_phone: { [Op.like]: searchPattern } },
        ],
      };

      if (isPosUser && userOutletId) {
        apptWhere.outlet_id = userOutletId;
      }

      tasks.push(
        Appointment.findAll({
          where: apptWhere,
          attributes: ['id', 'customer_name', 'customer_phone', 'appointment_date', 'start_time', 'status', 'outlet_id'],
          limit,
          order: [['appointment_date', 'DESC'], ['start_time', 'DESC']],
        })
          .then((rows) => ({
            category: 'appointments',
            items: rows.map((a) => ({
              id: a.id,
              title: a.customer_name,
              subtitle: `${a.appointment_date} at ${a.start_time || '--:--'} • ${a.customer_phone}`,
              category: 'appointments',
              badge: a.status,
              badgeColor: a.status === 'confirmed' ? 'emerald' : a.status === 'completed' ? 'sky' : 'amber',
              url: `/appointments?date=${a.appointment_date}&outletId=${a.outlet_id}&appointmentId=${a.id}&search=${encodeURIComponent(a.customer_name)}`,
              metadata: {
                date: a.appointment_date,
                time: a.start_time,
                status: a.status,
              },
            })),
          }))
          .catch((err) => {
            console.error('Search error in appointments:', err.message);
            return { category: 'appointments', items: [] };
          })
      );
    }

    // 8. Outlets (Admins/Managers)
    if (enabled('outlets') && !isPosUser) {
      tasks.push(
        Outlet.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: searchPattern } },
              { city: { [Op.like]: searchPattern } },
              { code: { [Op.like]: searchPattern } },
            ],
          },
          attributes: ['id', 'name', 'code', 'city', 'phone'],
          limit,
          order: [['name', 'ASC']],
        })
          .then((rows) => ({
            category: 'outlets',
            items: rows.map((o) => ({
              id: o.id,
              title: o.name,
              subtitle: `${o.city || 'Outlet'} • Code: ${o.code}`,
              category: 'outlets',
              badge: o.code,
              badgeColor: 'sky',
              url: `/outlets`,
              metadata: {
                city: o.city,
                phone: o.phone,
              },
            })),
          }))
          .catch((err) => {
            console.error('Search error in outlets:', err.message);
            return { category: 'outlets', items: [] };
          })
      );
    }

    const settledResults = await Promise.allSettled(tasks);
    const results = {
      customers: [],
      services: [],
      products: [],
      bills: [],
      staff: [],
      packages: [],
      appointments: [],
      outlets: [],
    };

    let totalCount = 0;

    settledResults.forEach((settled) => {
      if (settled.status === 'fulfilled' && settled.value) {
        const { category, items } = settled.value;
        if (results[category]) {
          results[category] = items || [];
          totalCount += items ? items.length : 0;
        }
      }
    });

    return res.json({
      query,
      totalCount,
      results,
    });
  } catch (err) {
    console.error('Fatal error in globalSearch:', err);
    return res.status(500).json({ message: 'Server error performing global search.' });
  }
};

module.exports = {
  globalSearch,
};
