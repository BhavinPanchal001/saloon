const { Op } = require('sequelize');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');

const getAll = async (req, res) => {
  try {
    const { search, status, category_id } = req.query;
    const where = {};

    const validStatuses = ['active', 'inactive'];
    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'status must be active or inactive.' });
      }
      where.status = status;
    }
    if (category_id) where.category_id = category_id;
    if (search) where.service_name = { [Op.like]: `%${search}%` };

    const services = await Service.findAll({
      where,
      include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'code'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json(services);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getById = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id, {
      include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'code'] }],
    });
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    return res.json(service);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  try {
    const { service_name, price, duration, category_id, product_linkages } = req.body;

    if (!service_name || price === undefined) {
      return res.status(400).json({ message: 'service_name and price are required.' });
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'price must be a non-negative number.' });
    }

    if (product_linkages !== undefined && !Array.isArray(product_linkages)) {
      return res.status(400).json({ message: 'product_linkages must be an array.' });
    }

    const service = await Service.create({
      service_name: service_name.trim(),
      price: parsedPrice,
      duration: Number(duration) || 30,
      category_id: category_id || null,
      product_linkages: product_linkages || [],
    });

    const result = await Service.findByPk(service.id, {
      include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'code'] }],
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found.' });

    const allowedFields = ['service_name', 'price', 'duration', 'category_id', 'product_linkages', 'status'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.price !== undefined) {
      const parsedPrice = Number(updates.price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'price must be a non-negative number.' });
      }
      updates.price = parsedPrice;
    }
    if (updates.duration !== undefined) {
      updates.duration = Math.max(1, Number(updates.duration) || 1);
    }
    if (updates.product_linkages !== undefined && !Array.isArray(updates.product_linkages)) {
      return res.status(400).json({ message: 'product_linkages must be an array.' });
    }

    await service.update(updates);

    const result = await Service.findByPk(service.id, {
      include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'code'] }],
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found.' });

    await service.destroy();
    return res.json({ message: 'Service deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, getById, create, update, remove };
