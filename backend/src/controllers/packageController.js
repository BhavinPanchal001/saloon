const { Op } = require('sequelize');
const { sequelize } = require('../models/db');
const Package = require('../models/Package');
const PackageService = require('../models/PackageService');
const Service = require('../models/Service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const withServiceItems = async (pkg) => {
  const rows = await PackageService.findAll({
    where: { package_id: pkg.id },
    order: [['id', 'ASC']],
  });

  const serviceIds = rows.map((r) => r.service_id);
  const services = serviceIds.length
    ? await Service.findAll({ where: { id: { [Op.in]: serviceIds } } })
    : [];
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  const serviceItems = rows.map((r) => {
    const svc = serviceMap[r.service_id];
    const sessions = r.sessions || 1;
    const unitPrice = svc ? Number(svc.price) : 0;
    const duration = svc ? Number(svc.duration) : 0;
    return {
      serviceId: r.service_id,
      serviceName: svc ? svc.service_name : `Service #${r.service_id}`,
      sessions,
      totalPrice: unitPrice * sessions,
      totalDuration: duration * sessions,
    };
  });

  const totalOriginalPrice = serviceItems.reduce((s, i) => s + i.totalPrice, 0);
  const totalDuration = serviceItems.reduce((s, i) => s + i.totalDuration, 0);
  const price = Number(pkg.price) || totalOriginalPrice;

  return {
    id: pkg.id,
    packageCode: pkg.package_code,
    packageName: pkg.package_name,
    offerLabel: pkg.offer_label || '',
    description: pkg.description || '',
    category: pkg.category,
    validityDays: pkg.validity_days,
    price,
    totalOriginalPrice,
    savings: Math.max(totalOriginalPrice - price, 0),
    totalDuration,
    serviceCount: serviceItems.length,
    serviceItems,
    status: pkg.status,
    featured: pkg.featured,
    bookableOnline: pkg.bookable_online,
    prepaidOnly: pkg.prepaid_only,
    maxRedemptionsPerVisit: pkg.max_redemptions_per_visit,
    saleChannels: pkg.sale_channels || [],
    assignedOutletIds: pkg.assigned_outlet_ids || [],
    termsAndConditions: pkg.terms_and_conditions || '',
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
};

// ─── Controllers ──────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && ['active', 'inactive'].includes(status)) {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { package_name: { [Op.like]: `%${search}%` } },
        { package_code: { [Op.like]: `%${search}%` } },
        { offer_label: { [Op.like]: `%${search}%` } },
      ];
    }

    const pkgs = await Package.findAll({ where, order: [['created_at', 'DESC']] });
    const result = await Promise.all(pkgs.map(withServiceItems));
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getOne = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found.' });
    return res.json(await withServiceItems(pkg));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      package_code, package_name, offer_label, description, category,
      validity_days, price, status, featured, bookable_online, prepaid_only,
      max_redemptions_per_visit, sale_channels, assigned_outlet_ids,
      terms_and_conditions, services,
    } = req.body;

    if (!package_name || !package_name.trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'package_name is required.' });
    }
    if (!services || !Array.isArray(services) || services.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one service is required.' });
    }

    let code = (package_code || '').trim();
    if (!code) {
      let attempts = 0;
      do {
        code = `PKG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const taken = await Package.findOne({ where: { package_code: code }, transaction: t });
        if (!taken) break;
        attempts++;
      } while (attempts < 5);
    }

    const existing = await Package.findOne({ where: { package_code: code }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ message: `package_code "${code}" is already in use.` });
    }

    const pkg = await Package.create({
      package_code: code,
      package_name: package_name.trim(),
      offer_label: (offer_label || '').trim() || null,
      description: (description || '').trim() || null,
      category: category || 'hair',
      validity_days: Number(validity_days) || 30,
      price: Number(price) || 0,
      status: status || 'active',
      featured: Boolean(featured),
      bookable_online: Boolean(bookable_online),
      prepaid_only: Boolean(prepaid_only),
      max_redemptions_per_visit: Math.max(1, Number(max_redemptions_per_visit) || 1),
      sale_channels: sale_channels || ['front_desk', 'pos'],
      assigned_outlet_ids: assigned_outlet_ids || [],
      terms_and_conditions: (terms_and_conditions || '').trim() || null,
    }, { transaction: t });

    const serviceRows = services
      .filter((s) => s.service_id || s.serviceId)
      .map((s) => ({
        package_id: pkg.id,
        service_id: s.service_id || s.serviceId,
        sessions: Math.max(1, Number(s.sessions) || 1),
      }));

    if (serviceRows.length) {
      await PackageService.bulkCreate(serviceRows, { transaction: t });
    }

    await t.commit();
    return res.status(201).json(await withServiceItems(pkg));
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pkg = await Package.findByPk(req.params.id, { transaction: t });
    if (!pkg) { await t.rollback(); return res.status(404).json({ message: 'Package not found.' }); }

    const {
      package_code, package_name, offer_label, description, category,
      validity_days, price, status, featured, bookable_online, prepaid_only,
      max_redemptions_per_visit, sale_channels, assigned_outlet_ids,
      terms_and_conditions, services,
    } = req.body;

    if (package_code && package_code.trim() !== pkg.package_code) {
      const dup = await Package.findOne({
        where: { package_code: package_code.trim(), id: { [Op.ne]: pkg.id } },
        transaction: t,
      });
      if (dup) { await t.rollback(); return res.status(409).json({ message: `package_code "${package_code.trim()}" is already in use.` }); }
    }

    const updates = {};
    if (package_code !== undefined) updates.package_code = package_code.trim();
    if (package_name !== undefined) updates.package_name = package_name.trim();
    if (offer_label !== undefined) updates.offer_label = offer_label.trim() || null;
    if (description !== undefined) updates.description = description.trim() || null;
    if (category !== undefined) updates.category = category;
    if (validity_days !== undefined) updates.validity_days = Number(validity_days) || 30;
    if (price !== undefined) updates.price = Number(price) || 0;
    if (status !== undefined) updates.status = status;
    if (featured !== undefined) updates.featured = Boolean(featured);
    if (bookable_online !== undefined) updates.bookable_online = Boolean(bookable_online);
    if (prepaid_only !== undefined) updates.prepaid_only = Boolean(prepaid_only);
    if (max_redemptions_per_visit !== undefined) updates.max_redemptions_per_visit = Math.max(1, Number(max_redemptions_per_visit) || 1);
    if (sale_channels !== undefined) updates.sale_channels = sale_channels;
    if (assigned_outlet_ids !== undefined) updates.assigned_outlet_ids = assigned_outlet_ids;
    if (terms_and_conditions !== undefined) updates.terms_and_conditions = terms_and_conditions.trim() || null;

    await pkg.update(updates, { transaction: t });

    if (Array.isArray(services)) {
      await PackageService.destroy({ where: { package_id: pkg.id }, transaction: t });
      const serviceRows = services
        .filter((s) => s.service_id || s.serviceId)
        .map((s) => ({
          package_id: pkg.id,
          service_id: s.service_id || s.serviceId,
          sessions: Math.max(1, Number(s.sessions) || 1),
        }));
      if (serviceRows.length) {
        await PackageService.bulkCreate(serviceRows, { transaction: t });
      }
    }

    await t.commit();
    const result = await withServiceItems(await Package.findByPk(pkg.id));
    return res.json(result);
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found.' });
    await pkg.update({ status: pkg.status === 'active' ? 'inactive' : 'active' });
    return res.json(await withServiceItems(pkg));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found.' });
    await pkg.destroy();
    return res.json({ message: 'Package deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, getOne, create, update, toggleStatus, remove };
