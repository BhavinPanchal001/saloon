const { Op } = require('sequelize');
const ServiceCategory = require('../models/ServiceCategory');
const Service = require('../models/Service');

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
      ];
    }

    const categories = await ServiceCategory.findAll({ where, order: [['name', 'ASC']] });
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  try {
    const { name, code, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'name and code are required.' });
    }

    const existing = await ServiceCategory.findOne({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(409).json({ message: 'Category code already exists.' });

    const category = await ServiceCategory.create({
      name,
      code: code.toUpperCase(),
      status: status || 'active',
    });

    return res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  try {
    const category = await ServiceCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    const { name, code, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (code !== undefined) {
      const upperCode = code.toUpperCase();
      const duplicate = await ServiceCategory.findOne({
        where: { code: upperCode },
      });
      if (duplicate && duplicate.id !== category.id) {
        return res.status(409).json({ message: 'Category code already exists.' });
      }
      updates.code = upperCode;
    }
    if (status !== undefined) updates.status = status;

    await category.update(updates);
    return res.json(category);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  try {
    const category = await ServiceCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    const inUse = await Service.count({ where: { category_id: req.params.id } });
    if (inUse > 0) {
      return res.status(409).json({ message: `Cannot delete: ${inUse} service(s) are assigned to this category.` });
    }

    await category.destroy();
    return res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, create, update, remove };
