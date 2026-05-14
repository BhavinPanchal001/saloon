const { Op } = require('sequelize');
const Outlet = require('../models/Outlet');

const toResponse = (outlet) => ({
  id: outlet.id,
  name: outlet.name,
  code: outlet.code,
  city: outlet.city,
  address: outlet.address || '',
  invoicePrefix: outlet.invoice_prefix || '',
  manager: outlet.manager || '',
  phone: outlet.phone || '',
  email: outlet.email || '',
  status: outlet.status,
  createdAt: outlet.createdAt,
  updatedAt: outlet.updatedAt,
});

const getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'status must be active or inactive.' });
      }
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { manager: { [Op.like]: `%${search}%` } },
      ];
    }

    const outlets = await Outlet.findAll({ where, order: [['name', 'ASC']] });
    return res.json(outlets.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getOne = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });
    return res.json(toResponse(outlet));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  try {
    const { name, code, city, address, invoice_prefix, manager, phone, email, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'code is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ message: 'city is required.' });
    }

    const existing = await Outlet.findOne({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(409).json({ message: `Outlet code "${code.trim().toUpperCase()}" is already in use.` });
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'status must be active or inactive.' });
    }

    const outlet = await Outlet.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: city.trim(),
      address: (address || '').trim() || null,
      invoice_prefix: (invoice_prefix || '').trim() || null,
      manager: (manager || '').trim() || null,
      phone: (phone || '').trim() || null,
      email: (email || '').trim() || null,
      status: status || 'active',
    });

    return res.status(201).json(toResponse(outlet));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });

    const { name, code, city, address, invoice_prefix, manager, phone, email, status } = req.body;

    if (code && code.trim().toUpperCase() !== outlet.code) {
      const dup = await Outlet.findOne({
        where: { code: code.trim().toUpperCase(), id: { [Op.ne]: outlet.id } },
      });
      if (dup) {
        return res.status(409).json({ message: `Outlet code "${code.trim().toUpperCase()}" is already in use.` });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (code !== undefined) updates.code = code.trim().toUpperCase();
    if (city !== undefined) updates.city = city.trim();
    if (address !== undefined) updates.address = address.trim() || null;
    if (invoice_prefix !== undefined) updates.invoice_prefix = invoice_prefix.trim() || null;
    if (manager !== undefined) updates.manager = manager.trim() || null;
    if (phone !== undefined) updates.phone = phone.trim() || null;
    if (email !== undefined) updates.email = email.trim() || null;
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'status must be active or inactive.' });
      }
      updates.status = status;
    }

    await outlet.update(updates);
    await outlet.reload();
    return res.json(toResponse(outlet));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });
    await outlet.update({ status: outlet.status === 'active' ? 'inactive' : 'active' });
    await outlet.reload();
    return res.json(toResponse(outlet));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  try {
    const outlet = await Outlet.findByPk(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found.' });
    await outlet.destroy();
    return res.json({ message: 'Outlet deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, getOne, create, update, toggleStatus, remove };
