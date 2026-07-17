const { Op } = require('sequelize');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const Product = require('../models/Product');

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

    const raw = service.toJSON();
    const linkages = Array.isArray(raw.product_linkages) ? raw.product_linkages : [];

    if (linkages.length > 0) {
      const ids = linkages.map((l) => l.inventoryId).filter(Boolean);
      const products = ids.length ? await Product.findAll({ where: { id: ids } }) : [];
      const productMap = Object.fromEntries(products.map((p) => [String(p.id), p.item_name]));
      raw.product_linkages = linkages.map((l) => ({
        ...l,
        productName: productMap[String(l.inventoryId)] || `Product #${l.inventoryId}`,
      }));
    }

    return res.json(raw);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};
const create = async (req, res) => {
  try {
    const { service_name, price, duration, category_id, product_linkages, images, assigned_outlet_ids } = req.body;

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

    if (assigned_outlet_ids !== undefined && !Array.isArray(assigned_outlet_ids)) {
      return res.status(400).json({ message: 'assigned_outlet_ids must be an array.' });
    }

    const service = await Service.create({
      service_name: service_name.trim(),
      price: parsedPrice,
      duration: Number(duration) || 30,
      category_id: category_id || null,
      product_linkages: product_linkages || [],
      images: Array.isArray(images) ? images : [],
      assigned_outlet_ids: assigned_outlet_ids || [],
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

    const allowedFields = ['service_name', 'price', 'duration', 'category_id', 'product_linkages', 'images', 'status', 'assigned_outlet_ids'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.assigned_outlet_ids !== undefined && !Array.isArray(updates.assigned_outlet_ids)) {
      return res.status(400).json({ message: 'assigned_outlet_ids must be an array.' });
    }
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
