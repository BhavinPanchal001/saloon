const { Op } = require('sequelize');
const { sequelize, OutletInventory, StockIssue, OutletProductPrice, Product, Outlet, Notification } = require('../models');
const AuditService = require('../services/auditService');

const LOW_STOCK_THRESHOLD = 5;

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
        {
          model: Product,
          attributes: ['id', 'item_name', 'unit_price', 'unit_master_id', 'purchase_unit', 'consumption_unit'],
          include: [{ association: 'unitMaster', required: false }]
        },
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
    const userId = req.admin?.id;

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

    // Log central stock before update
    const oldProductValues = {
      id: product.id,
      central_stock: product.central_stock,
      item_name: product.item_name
    };

    // Deduct from central stock
    const newCentralStock = currentCentralStock - parsedQty;
    await product.update(
      { central_stock: newCentralStock },
      { transaction }
    );

    // Log central stock change
    await AuditService.logCentralStockOperation('UPDATE', {
      id: product.id,
      oldValues: oldProductValues,
      newValues: { ...oldProductValues, central_stock: newCentralStock },
      quantityChange: -parsedQty,
      referenceId: null, // Will be set after stock issue creation
      referenceType: 'stock_issue',
      metadata: { operation: 'stock_issue_to_outlet', outletId, productId }
    }, req, transaction);

    // Find or create outlet inventory record
    let outletInventory = await OutletInventory.findOne({
      where: { outlet_id: outletId, product_id: productId },
      transaction,
    });

    let oldOutletInventoryValues = null;
    let inventoryOperation = 'CREATE';

    if (outletInventory) {
      // Update existing stock
      inventoryOperation = 'UPDATE';
      oldOutletInventoryValues = {
        id: outletInventory.id,
        outlet_id: outletInventory.outlet_id,
        product_id: outletInventory.product_id,
        current_stock: outletInventory.current_stock
      };
      
      const currentStock = parseFloat(outletInventory.current_stock);
      const newStock = currentStock + parsedQty;
      
      await outletInventory.update(
        { current_stock: newStock },
        { transaction }
      );
    } else {
      // Create new inventory record
      const newInventoryData = {
        outlet_id: outletId,
        product_id: productId,
        current_stock: parsedQty,
      };
      
      outletInventory = await OutletInventory.create(newInventoryData, { transaction });
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

    // Log the complete stock issue operation
    await AuditService.logStockIssue({
      outletInventoryId: outletInventory.id,
      oldValues: oldOutletInventoryValues,
      newValues: {
        id: outletInventory.id,
        outlet_id: outletId,
        product_id: productId,
        current_stock: outletInventory.current_stock
      },
      outlet_id: outletId,
      product_id: productId,
      quantityChange: parsedQty,
      stockIssueId: stockIssue.id,
      metadata: {
        outletName: outlet.name,
        productName: product.item_name,
        operation: 'stock_issue_complete'
      }
    }, req, transaction);

    // Handle selling price if provided
    if (sellingPrice !== undefined && sellingPrice !== '') {
      const parsedPrice = Number(sellingPrice);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        const existingPrice = await OutletProductPrice.findOne({
          where: { outlet_id: outletId, product_id: productId },
          transaction,
        });

        if (existingPrice) {
          // Log price update before change
          await AuditService.logInventoryChange({
            entityType: 'outlet_product_price',
            entityId: existingPrice.id,
            operation: 'UPDATE',
            oldValues: { price: existingPrice.price },
            newValues: { price: parsedPrice },
            outletId,
            productId,
            referenceId: stockIssue.id,
            referenceType: 'stock_issue',
            metadata: { priceUpdateSource: 'stock_issue_operation' }
          }, req, transaction);

          await existingPrice.update({ price: parsedPrice }, { transaction });
        } else {
          // Create new price record
          const newPrice = await OutletProductPrice.create(
            {
              outlet_id: outletId,
              product_id: productId,
              price: parsedPrice,
            },
            { transaction }
          );

          // Log price creation
          await AuditService.logInventoryChange({
            entityType: 'outlet_product_price',
            entityId: newPrice.id,
            operation: 'CREATE',
            newValues: { outlet_id: outletId, product_id: productId, price: parsedPrice },
            outletId,
            productId,
            referenceId: stockIssue.id,
            referenceType: 'stock_issue',
            metadata: { priceCreationSource: 'stock_issue_operation' }
          }, req, transaction);
        }
      }
    }

    await transaction.commit();

    // Check for low stock after commit and create notification if needed
    let lowStockWarning = null;
    const updatedInventory = await OutletInventory.findOne({
      where: { outlet_id: outletId, product_id: productId },
    });
    if (updatedInventory) {
      const finalStock = parseFloat(updatedInventory.current_stock);
      if (finalStock <= LOW_STOCK_THRESHOLD) {
        const isOutOfStock = finalStock <= 0;
        const notificationTitle = isOutOfStock
          ? 'Out of Stock'
          : 'Low Stock Alert';
        const notificationMessage = isOutOfStock
          ? `${product.item_name} is out of stock at ${outlet.name}`
          : `${product.item_name} is running low at ${outlet.name} (${finalStock} units remaining)`;

        await Notification.create({
          type: isOutOfStock ? 'alert' : 'warning',
          title: notificationTitle,
          message: notificationMessage,
          outlet_id: outletId,
          product_id: productId,
          read: false,
        });

        lowStockWarning = {
          productName: product.item_name,
          outletName: outlet.name,
          currentStock: finalStock,
          isOutOfStock,
        };
      }
    }

    return res.status(201).json({
      id: stockIssue.id,
      outletId: outlet.id,
      outletName: outlet.name,
      productId: product.id,
      itemName: product.item_name,
      qty: parsedQty,
      createdAt: stockIssue.created_at,
      lowStockWarning,
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
  const transaction = await sequelize.transaction();
  
  try {
    const { outletId, productId, price } = req.body;

    if (!outletId || !productId || price === undefined) {
      await transaction.rollback();
      return res.status(400).json({ message: 'outletId, productId, and price are required.' });
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'price must be a non-negative number.' });
    }

    // Check if price exists
    let outletPrice = await OutletProductPrice.findOne({
      where: { outlet_id: outletId, product_id: productId },
      transaction,
    });

    if (outletPrice) {
      // Log price update before change
      await AuditService.logInventoryChange({
        entityType: 'outlet_product_price',
        entityId: outletPrice.id,
        operation: 'UPDATE',
        oldValues: { price: outletPrice.price },
        newValues: { price: parsedPrice },
        outletId,
        productId,
        metadata: { operation: 'manual_price_update' }
      }, req, transaction);

      await outletPrice.update({ price: parsedPrice }, { transaction });
    } else {
      // Create new price record
      outletPrice = await OutletProductPrice.create({
        outlet_id: outletId,
        product_id: productId,
        price: parsedPrice,
      }, { transaction });

      // Log price creation
      await AuditService.logInventoryChange({
        entityType: 'outlet_product_price',
        entityId: outletPrice.id,
        operation: 'CREATE',
        newValues: { outlet_id: outletId, product_id: productId, price: parsedPrice },
        outletId,
        productId,
        metadata: { operation: 'manual_price_creation' }
      }, req, transaction);
    }

    await transaction.commit();
    return res.json({ success: true, data: outletPrice });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Delete outlet product price
const deleteOutletProductPrice = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { outletId, productId } = req.params;

    const outletPrice = await OutletProductPrice.findOne({
      where: { outlet_id: outletId, product_id: productId },
      transaction,
    });

    if (!outletPrice) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Outlet product price not found.' });
    }

    // Log price deletion before removal
    await AuditService.logInventoryChange({
      entityType: 'outlet_product_price',
      entityId: outletPrice.id,
      operation: 'DELETE',
      oldValues: { 
        id: outletPrice.id,
        outlet_id: outletPrice.outlet_id,
        product_id: outletPrice.product_id,
        price: outletPrice.price
      },
      outletId,
      productId,
      metadata: { operation: 'manual_price_deletion' }
    }, req, transaction);

    await outletPrice.destroy({ transaction });
    await transaction.commit();
    return res.json({ message: 'Outlet product price deleted successfully.' });
  } catch (err) {
    await transaction.rollback();
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
