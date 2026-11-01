const { randomUUID } = require("crypto");
const costs = require("../services/inventoryCostService");
const { sequelize, InventoryLot, UnitMaster } = require("../models");
const { Op } = require('sequelize');
const { normalizeBarcode } = require('../utils/barcode');
const Product = require('../models/Product');
const { OutletInventory, StockIssue, OutletProductPrice, PurchaseOrderItem } = require('../models');

const productWriteError = (res, err) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  if (err.name === 'BarcodeValidationError') return res.status(400).json({ message: err.message });
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'This barcode is already assigned to another product.' });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ message: 'Invalid unit group. Please select an existing unit group.' });
  }
  console.error('[Product write]', err);
  return res.status(500).json({ message: 'Server error.' });
};

const productName = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    costs.invalid('Item name must contain 1–200 characters.');
  }
  return value.trim();
};

const unitMasterId = async (value, transaction) => {
  if (value === null || value === undefined || value === '') return null;
  if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))
      || !Number.isSafeInteger(Number(value)) || Number(value) <= 0
      || !await UnitMaster.findByPk(Number(value), { transaction })) {
    costs.invalid('Invalid unit group. Please select an existing unit group.');
  }
  return Number(value);
};

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
    if (search) where[Op.or] = [
      { item_name: { [Op.like]: `%${search}%` } },
      { barcode: { [Op.like]: `%${search}%` } },
    ];

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
    const user = req.user || req.admin;
    const canViewCost = ['admin', 'super_admin'].includes(user?.role) || user?.permissions?.includes('*') || user?.permissions?.includes('reports:view');
    return res.json(products.map((product) => { const data = product.toJSON(); if (!canViewCost) delete data.opening_unit_cost; return data; }));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    const data = product.toJSON();
    const user = req.user || req.admin;
    if (!['admin', 'super_admin'].includes(user?.role) && !user?.permissions?.includes('*') && !user?.permissions?.includes('reports:view')) delete data.opening_unit_cost;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      item_name, barcode, unit_price, unit_master_id, opening_stock,
      purchase_unit, consumption_unit, product_measure, product_measure_unit, images,
    } = req.body;

    const name = productName(item_name);

    const parsedPrice = Number(costs.numeric(unit_price, "Selling price", { places: 2 }));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      costs.invalid('unit_price must be a non-negative number.');
    }

    const measure = costs.positive(req.body.product_measure ?? 1, 'Product measure');
    const parsedOpeningStock = Number(opening_stock || 0);
    if (!Number.isFinite(parsedOpeningStock) || parsedOpeningStock < 0) costs.invalid('Opening stock must be non-negative.');
    const openingCost = req.body.opening_unit_cost === '' || req.body.opening_unit_cost == null ? null : Number(req.body.opening_unit_cost);
    if (openingCost !== null && (!Number.isFinite(openingCost) || openingCost < 0)) costs.invalid('Opening cost must be non-negative.');

    const validUnitMasterId = await unitMasterId(unit_master_id, transaction);

    const product = await Product.create({
      item_name: name,
      barcode: normalizeBarcode(barcode) || `GLP-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`,
      unit_price: parsedPrice,
      opening_stock: parsedOpeningStock,
      central_stock: 0,
      opening_unit_cost: openingCost,
      unit_master_id: validUnitMasterId,
      purchase_unit: purchase_unit || 'primary',
      consumption_unit: consumption_unit || 'primary',
      product_measure: measure.toFixed(4),
      product_measure_unit: product_measure_unit || 'primary',
      images: Array.isArray(images) ? images : [],
    }, { transaction });
    await costs.adjustOpening(product, parsedOpeningStock, openingCost, transaction);
    await transaction.commit();
    return res.status(201).json(product);
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    return productWriteError(res, err);
  }
};

const update = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 });

    const allowedFields = [
      'item_name', 'barcode', 'unit_price', 'opening_unit_cost', 'opening_stock', 'unit_master_id',
      'purchase_unit', 'consumption_unit', 'product_measure',
      'product_measure_unit', 'status', 'images',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.item_name !== undefined) updates.item_name = productName(updates.item_name);
    if (updates.barcode !== undefined) updates.barcode = normalizeBarcode(updates.barcode) || product.barcode || `GLP-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

    if (updates.unit_price !== undefined) {
      updates.unit_price = Number(costs.numeric(updates.unit_price, 'Selling price', { places: 2 }));
    }
    let stockDelta = 0;
    if (updates.opening_stock !== undefined) {
      const value = Number(updates.opening_stock);
      if (!Number.isFinite(value) || value < 0) costs.invalid('Opening stock must be non-negative.');
      stockDelta = costs.D(value).minus(product.opening_stock);
      updates.opening_stock = value;
    }
    if (updates.opening_unit_cost !== undefined) {
      const value = updates.opening_unit_cost === '' || updates.opening_unit_cost === null ? null : Number(updates.opening_unit_cost);
      if (value !== null && (!Number.isFinite(value) || value < 0)) costs.invalid('Opening cost must be non-negative.');
      updates.opening_unit_cost = value;
    }
    if (updates.unit_master_id !== undefined) updates.unit_master_id = await unitMasterId(updates.unit_master_id, transaction);

    if (updates.product_measure !== undefined) updates.product_measure = costs.positive(updates.product_measure, 'Product measure').toFixed(4);
    if (updates.unit_master_id !== undefined && Number(updates.unit_master_id || 0) !== Number(product.unit_master_id || 0)
        && await InventoryLot.count({ where: { product_id: product.id }, transaction })) costs.invalid('Cannot change the base unit group after inventory history exists. Create a separate product instead.');
    await costs.adjustOpening(product, stockDelta, updates.opening_unit_cost ?? product.opening_unit_cost, transaction);
    await product.update(updates, { transaction });
    await transaction.commit();
    const data = product.toJSON();
    const user = req.user || req.admin;
    if (!['admin', 'super_admin'].includes(user?.role) && !user?.permissions?.includes('*') && !user?.permissions?.includes('reports:view')) delete data.opening_unit_cost;
    return res.json(data);
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    return productWriteError(res, err);
  }
};

const remove = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const product = await Product.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 });
      // Archiving also prevents a concurrent sale/delete race from orphaning stock or cost history.
      await product.update({ status: 'inactive' }, { transaction });
    });
    return res.json({ message: 'Product archived to preserve its barcode, stock and cost history.' });
  } catch (err) { return productWriteError(res, err); }
};

module.exports = { getAll, getById, create, update, remove };
