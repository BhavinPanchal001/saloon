const { Op } = require('sequelize');
const Product = require('../models/Product');
const { OutletInventory, StockIssue, OutletProductPrice, PurchaseOrderItem } = require('../models');

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
    if (search) where.item_name = { [Op.like]: `%${search}%` };

    const products = await Product.findAll({ 
      where, 
      include: [
        {
          association: 'unitMaster',
          required: false
        }
      ],
      order: [['created_at', 'DESC']] 
    });
    return res.json(products);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  try {
    const {
      item_name, unit_price, unit_master_id, opening_stock,
      purchase_unit, consumption_unit, product_measure, product_measure_unit,
    } = req.body;

    if (!item_name || unit_price === undefined) {
      return res.status(400).json({ message: 'item_name and unit_price are required.' });
    }

    const parsedPrice = Number(unit_price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'unit_price must be a non-negative number.' });
    }

    const parsedOpeningStock = Number(opening_stock) || 0;

    // Handle unit_master_id - convert string values to null if not numeric
    let validUnitMasterId = null;
    if (unit_master_id !== null && unit_master_id !== undefined) {
      if (typeof unit_master_id === 'string' && /^\d+$/.test(unit_master_id)) {
        validUnitMasterId = Number(unit_master_id);
      } else if (typeof unit_master_id === 'number') {
        validUnitMasterId = unit_master_id;
      }
    }

    const product = await Product.create({
      item_name: item_name.trim(),
      unit_price: parsedPrice,
      opening_stock: parsedOpeningStock,
      central_stock: parsedOpeningStock,
      unit_master_id: validUnitMasterId,
      purchase_unit: purchase_unit || 'primary',
      consumption_unit: consumption_unit || 'primary',
      product_measure: Number(product_measure) || 1,
      product_measure_unit: product_measure_unit || 'primary',
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const allowedFields = [
      'item_name', 'unit_price', 'opening_stock', 'unit_master_id',
      'purchase_unit', 'consumption_unit', 'product_measure',
      'product_measure_unit', 'status',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.unit_price !== undefined) {
      const parsedPrice = Number(updates.unit_price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'unit_price must be a non-negative number.' });
      }
      updates.unit_price = parsedPrice;
    }
    if (updates.opening_stock !== undefined) {
      updates.opening_stock = Number(updates.opening_stock) || 0;
    }
    if (updates.unit_master_id !== undefined && updates.unit_master_id !== null) {
      if (typeof updates.unit_master_id === 'string' && !/^\d+$/.test(updates.unit_master_id)) {
        updates.unit_master_id = null;
      } else {
        updates.unit_master_id = Number(updates.unit_master_id) || null;
      }
    }

    await product.update(updates);
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    await OutletProductPrice.destroy({ where: { product_id: req.params.id } });
    await StockIssue.destroy({ where: { product_id: req.params.id } });
    await OutletInventory.destroy({ where: { product_id: req.params.id } });
    await product.destroy();

    return res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('[DELETE product]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, getById, create, update, remove };
