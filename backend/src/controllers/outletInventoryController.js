const { Op } = require('sequelize');
const { sequelize, OutletInventory, StockIssue, OutletProductPrice, Product, Outlet } = require('../models');

// Get inventory for outlets (with optional outlet filter)
const getInventory = async (req, res) => {
  try {
    const { outletId } = req.query;
    const where = {};
    
    if (outletId && outletId !== 'undefined') {
      where.outlet_id = outletId;
    }

    const inventory = await OutletInventory.findAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'item_name', 'unit_price', 'unit_master_id'] },
        { model: Outlet, attributes: ['id', 'name', 'code'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(inventory);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Issue product to outlet
const issueProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { outletId, productId, qty, sellingPrice } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!outletId || outletId === '') {
      return res.status(400).json({ message: 'outletId is required.' });
    }
    if (!productId || productId === '') {
      return res.status(400).json({ message: 'productId is required.' });
    }
    if (qty === undefined || qty === '' || qty === null) {
      return res.status(400).json({ message: 'qty is required.' });
    }

    const parsedQty = Number(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ message: 'qty must be a positive number.' });
    }

    // Check product exists
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check outlet exists
    const outlet = await Outlet.findByPk(outletId, { transaction });
    if (!outlet) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Outlet not found.' });
    }

    // Check central stock availability
    const currentCentralStock = parseFloat(product.central_stock);
    if (currentCentralStock < parsedQty) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Not enough central stock available to issue.' });
    }

    // Deduct from central stock
    await product.update(
      { central_stock: currentCentralStock - parsedQty },
      { transaction }
    );

    // Find or create outlet inventory record
    let outletInventory = await OutletInventory.findOne({
      where: { outlet_id: outletId, product_id: productId },
      transaction,
    });

    if (outletInventory) {
      // Update existing stock
      const currentStock = parseFloat(outletInventory.current_stock);
      await outletInventory.update(
        { current_stock: currentStock + parsedQty },
        { transaction }
      );
    } else {
      // Create new inventory record
      outletInventory = await OutletInventory.create(
        {
          outlet_id: outletId,
          product_id: productId,
          current_stock: parsedQty,
        },
        { transaction }
      );
    }

    // Create stock issue record
    const stockIssue = await StockIssue.create(
      {
        outlet_id: outletId,
        product_id: productId,
        qty: parsedQty,
        issued_by: userId,
      },
      { transaction }
    );

    // Handle selling price if provided
    if (sellingPrice !== undefined && sellingPrice !== '') {
      const parsedPrice = Number(sellingPrice);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        const existingPrice = await OutletProductPrice.findOne({
          where: { outlet_id: outletId, product_id: productId },
          transaction,
        });

        if (existingPrice) {
          await existingPrice.update({ price: parsedPrice }, { transaction });
        } else {
          await OutletProductPrice.create(
            {
              outlet_id: outletId,
              product_id: productId,
              price: parsedPrice,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    return res.status(201).json({
      id: stockIssue.id,
      outletId: outlet.id,
      outletName: outlet.name,
      productId: product.id,
      itemName: product.item_name,
      qty: parsedQty,
      createdAt: stockIssue.created_at,
    });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get stock issue history
const getStockIssues = async (req, res) => {
  try {
    const { outletId, productId } = req.query;
    const where = {};
    
    if (outletId && outletId !== 'undefined') where.outlet_id = outletId;
    if (productId && productId !== 'undefined') where.product_id = productId;

    const issues = await StockIssue.findAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'item_name'] },
        { model: Outlet, attributes: ['id', 'name', 'code'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(issues);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get outlet product prices
const getOutletProductPrices = async (req, res) => {
  try {
    const { outletId, productId } = req.query;
    const where = {};
    
    if (outletId && outletId !== 'undefined') where.outlet_id = outletId;
    if (productId && productId !== 'undefined') where.product_id = productId;

    const prices = await OutletProductPrice.findAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'item_name', 'unit_price'] },
        { model: Outlet, attributes: ['id', 'name', 'code'] },
      ],
    });

    return res.json(prices);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Save/Update outlet product price
const saveOutletProductPrice = async (req, res) => {
  try {
    const { outletId, productId, price } = req.body;

    if (!outletId || !productId || price === undefined) {
      return res.status(400).json({ message: 'outletId, productId, and price are required.' });
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'price must be a non-negative number.' });
    }

    // Check if price exists
    let outletPrice = await OutletProductPrice.findOne({
      where: { outlet_id: outletId, product_id: productId },
    });

    if (outletPrice) {
      await outletPrice.update({ price: parsedPrice });
    } else {
      outletPrice = await OutletProductPrice.create({
        outlet_id: outletId,
        product_id: productId,
        price: parsedPrice,
      });
    }

    return res.json({ success: true, data: outletPrice });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Delete outlet product price
const deleteOutletProductPrice = async (req, res) => {
  try {
    const { outletId, productId } = req.params;

    const outletPrice = await OutletProductPrice.findOne({
      where: { outlet_id: outletId, product_id: productId },
    });

    if (!outletPrice) {
      return res.status(404).json({ message: 'Outlet product price not found.' });
    }

    await outletPrice.destroy();
    return res.json({ message: 'Outlet product price deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getInventory,
  issueProduct,
  getStockIssues,
  getOutletProductPrices,
  saveOutletProductPrice,
  deleteOutletProductPrice,
};
