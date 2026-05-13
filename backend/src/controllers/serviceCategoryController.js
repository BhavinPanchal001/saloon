const ServiceCategory = require('../models/ServiceCategory');

const getAll = async (req, res) => {
  try {
    const categories = await ServiceCategory.findAll({ order: [['name', 'ASC']] });
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

    await category.destroy();
    return res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, create, update, remove };
