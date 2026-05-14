const { Op } = require('sequelize');
const UnitMaster = require('../models/UnitMaster');
const Product = require('../models/Product');

const getAll = async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};

    const validStatuses = ['active', 'inactive'];
    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'status must be active or inactive.' });
      }
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { group_name: { [Op.like]: `%${search}%` } },
        { primary_unit: { [Op.like]: `%${search}%` } },
        { secondary_unit: { [Op.like]: `%${search}%` } },
      ];
    }

    const units = await UnitMaster.findAll({ where, order: [['group_name', 'ASC']] });
    return res.json(units);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  try {
    const {
      group_name, primary_unit, primary_abbr,
      secondary_unit, secondary_abbr, conversion_ratio, status,
    } = req.body;

    if (!group_name || !primary_unit || !primary_abbr || !secondary_unit || !secondary_abbr) {
      return res.status(400).json({ message: 'group_name, primary_unit, primary_abbr, secondary_unit, and secondary_abbr are required.' });
    }

    const parsedRatio = Number(conversion_ratio);
    if (!conversion_ratio || isNaN(parsedRatio) || parsedRatio <= 0) {
      return res.status(400).json({ message: 'conversion_ratio must be a positive number.' });
    }

    const unit = await UnitMaster.create({
      group_name: group_name.trim(),
      primary_unit: primary_unit.trim(),
      primary_abbr: primary_abbr.trim().toUpperCase(),
      secondary_unit: secondary_unit.trim(),
      secondary_abbr: secondary_abbr.trim().toUpperCase(),
      conversion_ratio: parsedRatio,
      status: status || 'active',
    });

    return res.status(201).json(unit);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  try {
    const unit = await UnitMaster.findByPk(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Unit master not found.' });

    const allowedFields = [
      'group_name', 'primary_unit', 'primary_abbr',
      'secondary_unit', 'secondary_abbr', 'conversion_ratio', 'status',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.conversion_ratio !== undefined) {
      const parsedRatio = Number(updates.conversion_ratio);
      if (isNaN(parsedRatio) || parsedRatio <= 0) {
        return res.status(400).json({ message: 'conversion_ratio must be a positive number.' });
      }
      updates.conversion_ratio = parsedRatio;
    }
    if (updates.primary_abbr) updates.primary_abbr = updates.primary_abbr.toUpperCase();
    if (updates.secondary_abbr) updates.secondary_abbr = updates.secondary_abbr.toUpperCase();

    await unit.update(updates);
    return res.json(unit);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const unit = await UnitMaster.findByPk(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Unit master not found.' });

    await unit.update({ status: unit.status === 'active' ? 'inactive' : 'active' });
    return res.json(unit);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  try {
    const unit = await UnitMaster.findByPk(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Unit master not found.' });

    const inUse = await Product.count({ where: { unit_master_id: Number(req.params.id) } });
    if (inUse > 0) {
      return res.status(409).json({ message: 'Cannot delete: this unit group is used by one or more products.' });
    }

    await unit.destroy();
    return res.json({ message: 'Unit master deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, create, update, toggleStatus, remove };
