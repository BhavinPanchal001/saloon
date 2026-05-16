const { Op } = require('sequelize');
const { sequelize } = require('../models/db');
const fs = require('fs');
const path = require('path');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const PaymentDetail = require('../models/PaymentDetail');

// Set up associations (idempotent)
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });

const generatePoNumber = async (transaction) => {
  const today = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const last = await PurchaseOrder.findOne({
    where: { po_number: { [Op.like]: `${prefix}%` } },
    order: [['po_number', 'DESC']],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  const seq = last ? parseInt(last.po_number.slice(-4), 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
};

const toItemResponse = (item) => ({
  id: item.id,
  productId: item.product_id,
  productName: item.product_name,
  qty: Number(item.qty),
  unitPrice: Number(item.unit_price),
  lineTotal: Number(item.line_total),
});

const toResponse = (po) => ({
  id: po.id,
  poNumber: po.po_number,
  supplierName: po.supplier_name,
  supplierContact: po.supplier_contact || '',
  supplierEmail: po.supplier_email || '',
  status: po.status,
  subtotal: Number(po.subtotal),
  taxRate: Number(po.tax_rate),
  taxAmount: Number(po.tax_amount),
  totalCost: Number(po.total_cost),
  notes: po.notes || '',
  attachmentPath: po.attachment_path || null,
  orderDate: po.order_date,
  approvedAt: po.approved_at,
  receivedAt: po.received_at,
  items: (po.items || []).map(toItemResponse),
  payments: (po.Payments || []).map((p) => ({
    id: p.id,
    totalAmount: Number(p.total_amount),
    status: p.status,
    transactionReference: p.transaction_reference || '',
    notes: p.notes || '',
    paymentDate: p.payment_date,
    details: (p.details || p.PaymentDetails || []).map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      paymentMode: d.payment_mode,
    })),
  })),
  createdAt: po.createdAt,
  updatedAt: po.updatedAt,
});

const getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && status !== 'all') {
      if (!['pending', 'approved', 'received', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { po_number: { [Op.like]: `%${search}%` } },
        { supplier_name: { [Op.like]: `%${search}%` } },
      ];
    }

    const orders = await PurchaseOrder.findAll({
      where,
      include: [
        { model: PurchaseOrderItem, as: 'items' },
        { model: Payment, as: 'Payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(orders.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getOne = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: PurchaseOrderItem, as: 'items' },
        { model: Payment, as: 'Payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });
    if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
    return res.json(toResponse(po));
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const body = req.body;
    const supplierName = body.supplierName;
    const supplier_contact = body.supplier_contact;
    const supplier_email = body.supplier_email;
    const taxRate = body.taxRate;
    const notes = body.notes;
    const orderDate = body.orderDate;
    const items = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;
    const payment = typeof body.payment === 'string' ? JSON.parse(body.payment) : body.payment;

    if (!supplierName || !supplierName.trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'supplierName is required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one item is required.' });
    }

    const parsedTaxRate = Math.max(0, Number(taxRate) || 0);
    if (parsedTaxRate > 100) {
      await t.rollback();
      return res.status(400).json({ message: 'taxRate cannot exceed 100.' });
    }

    // Validate all product IDs exist
    const productIds = items.map((i) => Number(i.productId));
    const products = await Product.findAll({ where: { id: productIds }, transaction: t });
    if (products.length !== productIds.length) {
      await t.rollback();
      return res.status(400).json({ message: 'One or more product IDs are invalid.' });
    }
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Calculate totals
    let subtotal = 0;
    const itemRows = items.map((item) => {
      const qty = Math.max(1, Math.round(Number(item.qty) || 1));
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;
      return {
        product_id: Number(item.productId),
        product_name: productMap[Number(item.productId)].item_name,
        qty,
        unit_price: unitPrice,
        line_total: lineTotal,
      };
    });

    const taxAmount = Math.round(subtotal * (parsedTaxRate / 100) * 100) / 100;
    const totalCost = subtotal + taxAmount;
    const poNumber = await generatePoNumber(t);
    const resolvedOrderDate = orderDate || new Date().toISOString().split('T')[0];

    const po = await PurchaseOrder.create({
      po_number: poNumber,
      supplier_name: supplierName.trim(),
      supplier_contact: (supplier_contact || '').trim() || null,
      supplier_email: (supplier_email || '').trim() || null,
      status: 'received',
      subtotal,
      tax_rate: parsedTaxRate,
      tax_amount: taxAmount,
      total_cost: totalCost,
      notes: (notes || '').trim() || null,
      attachment_path: req.file ? `po-attachments/${req.file.filename}` : null,
      order_date: resolvedOrderDate,
      approved_at: new Date(),
      received_at: new Date(),
    }, { transaction: t });

    const createdItems = await PurchaseOrderItem.bulkCreate(
      itemRows.map((row) => ({ ...row, purchase_order_id: po.id })),
      { transaction: t }
    );

    // Increment central_stock for each item (auto-receive)
    for (const item of itemRows) {
      await Product.increment(
        { central_stock: item.qty },
        { where: { id: item.product_id }, transaction: t }
      );
    }

    // Create payment if provided
    let createdPayment = null;
    if (payment && Array.isArray(payment.details) && payment.details.length > 0) {
      const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
      let totalAmount = 0;
      const detailRows = payment.details.map((d) => {
        const amount = Math.max(0, Number(d.amount) || 0);
        totalAmount += amount;
        if (!validModes.includes(d.paymentMode)) {
          throw new Error(`Invalid payment mode: ${d.paymentMode}. Must be one of: ${validModes.join(', ')}`);
        }
        return {
          amount,
          payment_mode: d.paymentMode,
        };
      });

      // Only create payment if amount > 0
      if (totalAmount > 0) {
        // Determine status based on payment vs total cost
        const paymentStatus = totalAmount >= totalCost ? 'completed' : 'pending';

        createdPayment = await Payment.create({
          purchase_order_id: po.id,
          expense_id: null,
          pos_id: null,
          total_amount: totalAmount,
          status: payment.status || paymentStatus,
          transaction_reference: (payment.transactionReference || '').trim() || null,
          notes: (payment.notes || '').trim() || null,
          payment_date: payment.paymentDate || new Date().toISOString().split('T')[0],
        }, { transaction: t });

        await PaymentDetail.bulkCreate(
          detailRows.map((row) => ({ ...row, payment_id: createdPayment.id })),
          { transaction: t }
        );
      }
    }

    await t.commit();

    const created = await PurchaseOrder.findByPk(po.id, {
      include: [
        { model: PurchaseOrderItem, as: 'items' },
        { model: Payment, as: 'Payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });
    return res.status(201).json(toResponse(created));
  } catch (err) {
    await t.rollback();
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'PO number collision — please retry.' });
    }
    return res.status(500).json({ message: 'Server error.' });
  }
};

const approve = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });
    if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
    if (po.status !== 'pending') {
      return res.status(400).json({ message: `Cannot approve a PO with status "${po.status}".` });
    }
    await po.update({ status: 'approved', approved_at: new Date() });
    await po.reload({ include: [
      { model: PurchaseOrderItem, as: 'items' },
      { model: Payment, as: 'Payments', include: [{ model: PaymentDetail, as: 'details' }] },
    ] });
    return res.json(toResponse(po));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const receive = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction: t,
    });
    if (!po) { await t.rollback(); return res.status(404).json({ message: 'Purchase order not found.' }); }
    if (po.status !== 'approved') {
      await t.rollback();
      return res.status(400).json({ message: `Cannot receive a PO with status "${po.status}". Approve it first.` });
    }

    // Increment central_stock for each item
    for (const item of po.items) {
      await Product.increment(
        { central_stock: item.qty },
        { where: { id: item.product_id }, transaction: t }
      );
    }

    await po.update({ status: 'received', received_at: new Date() }, { transaction: t });
    await t.commit();
    const received = await PurchaseOrder.findByPk(po.id, {
      include: [
        { model: PurchaseOrderItem, as: 'items' },
        { model: Payment, as: 'Payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });
    return res.json(toResponse(received));
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const cancel = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });
    if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
    if (po.status === 'received') {
      return res.status(400).json({ message: 'Cannot cancel a PO that has already been received.' });
    }
    if (po.status === 'cancelled') {
      return res.status(400).json({ message: 'Purchase order is already cancelled.' });
    }
    await po.update({ status: 'cancelled' });
    await po.reload({ include: [
      { model: PurchaseOrderItem, as: 'items' },
      { model: Payment, as: 'Payments', include: [{ model: PaymentDetail, as: 'details' }] },
    ] });
    return res.json(toResponse(po));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const body = req.body;
    const supplierName = body.supplierName;
    const supplierContact = body.supplierContact;
    const supplierEmail = body.supplierEmail;
    const taxRate = body.taxRate;
    const notes = body.notes;
    const orderDate = body.orderDate;
    const items = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;
    const payment = typeof body.payment === 'string' ? JSON.parse(body.payment) : body.payment;
    const poId = req.params.id;

    const po = await PurchaseOrder.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction: t,
    });
    if (!po) { await t.rollback(); return res.status(404).json({ message: 'Purchase order not found.' }); }

    if (!supplierName || !supplierName.trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'supplierName is required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one item is required.' });
    }

    const parsedTaxRate = Math.max(0, Number(taxRate) || 0);
    if (parsedTaxRate > 100) {
      await t.rollback();
      return res.status(400).json({ message: 'taxRate cannot exceed 100.' });
    }

    // If PO was received, reverse the stock changes from old items
    if (po.status === 'received') {
      for (const oldItem of po.items) {
        await Product.increment(
          { central_stock: -oldItem.qty },
          { where: { id: oldItem.product_id }, transaction: t }
        );
      }
    }

    // Delete old items
    await PurchaseOrderItem.destroy({ where: { purchase_order_id: poId }, transaction: t });

    // Validate product IDs and create new items
    const productIds = items.map((i) => Number(i.productId));
    const products = await Product.findAll({ where: { id: productIds }, transaction: t });
    if (products.length !== productIds.length) {
      await t.rollback();
      return res.status(400).json({ message: 'One or more product IDs are invalid.' });
    }
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Calculate new totals
    let subtotal = 0;
    const itemRows = items.map((item) => {
      const qty = Math.max(1, Math.round(Number(item.qty) || 1));
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;
      return {
        purchase_order_id: poId,
        product_id: Number(item.productId),
        product_name: productMap[Number(item.productId)].item_name,
        qty,
        unit_price: unitPrice,
        line_total: lineTotal,
      };
    });

    const taxAmount = Math.round(subtotal * (parsedTaxRate / 100) * 100) / 100;
    const totalCost = subtotal + taxAmount;

    // Update PO
    await po.update({
      supplier_name: supplierName.trim(),
      supplier_contact: (supplierContact || '').trim() || null,
      supplier_email: (supplierEmail || '').trim() || null,
      subtotal,
      tax_rate: parsedTaxRate,
      tax_amount: taxAmount,
      total_cost: totalCost,
      notes: (notes || '').trim() || null,
      order_date: orderDate || po.order_date,
      ...(req.file ? { attachment_path: `po-attachments/${req.file.filename}` } : {}),
    }, { transaction: t });

    // Create new items
    await PurchaseOrderItem.bulkCreate(itemRows, { transaction: t });

    // If PO was received, apply stock changes for new items
    if (po.status === 'received') {
      for (const item of itemRows) {
        await Product.increment(
          { central_stock: item.qty },
          { where: { id: item.product_id }, transaction: t }
        );
      }
    }

    // Handle payments - delete old ones and create new if provided, or delete all if disabled
    if (payment && Array.isArray(payment.details) && payment.details.length > 0) {
      // Delete existing payments (cascade will delete payment details)
      await Payment.destroy({ where: { purchase_order_id: poId }, transaction: t });

      const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
      let totalAmount = 0;
      const detailRows = payment.details.map((d) => {
        const amount = Math.max(0, Number(d.amount) || 0);
        totalAmount += amount;
        if (!validModes.includes(d.paymentMode)) {
          throw new Error(`Invalid payment mode: ${d.paymentMode}. Must be one of: ${validModes.join(', ')}`);
        }
        return {
          amount,
          payment_mode: d.paymentMode,
        };
      });

      // Only create payment if there's a valid amount
      if (totalAmount > 0) {
        const createdPayment = await Payment.create({
          purchase_order_id: poId,
          expense_id: null,
          pos_id: null,
          total_amount: totalAmount,
          status: payment.status || 'completed',
          transaction_reference: (payment.transactionReference || '').trim() || null,
          notes: (payment.notes || '').trim() || null,
          payment_date: payment.paymentDate || new Date().toISOString().split('T')[0],
        }, { transaction: t });

        await PaymentDetail.bulkCreate(
          detailRows.map((row) => ({ ...row, payment_id: createdPayment.id })),
          { transaction: t }
        );
      }
    } else if (payment === null || payment === false) {
      // Payment explicitly disabled - delete all existing payments
      await Payment.destroy({ where: { purchase_order_id: poId }, transaction: t });
    }

    await t.commit();

    const updated = await PurchaseOrder.findByPk(poId, {
      include: [
        { model: PurchaseOrderItem, as: 'items' },
        { model: Payment, as: 'Payments', include: [{ model: PaymentDetail, as: 'details' }] },
      ],
    });
    return res.json(toResponse(updated));
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
};

const remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const poId = req.params.id;

    const po = await PurchaseOrder.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction: t,
    });
    if (!po) { await t.rollback(); return res.status(404).json({ message: 'Purchase order not found.' }); }

    // If PO was received, reverse stock changes
    if (po.status === 'received') {
      for (const item of po.items) {
        await Product.increment(
          { central_stock: -item.qty },
          { where: { id: item.product_id }, transaction: t }
        );
      }
    }

    // Delete payments (cascade will delete payment details)
    await Payment.destroy({ where: { purchase_order_id: poId }, transaction: t });

    // Delete PO items
    await PurchaseOrderItem.destroy({ where: { purchase_order_id: poId }, transaction: t });

    // Delete PO
    await po.destroy({ transaction: t });

    await t.commit();
    return res.json({ message: 'Purchase order deleted successfully.' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const removeAttachment = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
    if (!po.attachment_path) return res.status(404).json({ message: 'No attachment found.' });

    const filePath = path.join(__dirname, '../../uploads', po.attachment_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await po.update({ attachment_path: null });
    return res.json({ message: 'Attachment deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, getOne, create, update, approve, receive, cancel, remove, removeAttachment };
