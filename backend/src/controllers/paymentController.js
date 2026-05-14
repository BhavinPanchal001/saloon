const { Op } = require('sequelize');
const { sequelize } = require('../models/db');
const Payment = require('../models/Payment');
const PaymentDetail = require('../models/PaymentDetail');
const PurchaseOrder = require('../models/PurchaseOrder');

const toDetailResponse = (detail) => ({
  id: detail.id,
  amount: Number(detail.amount),
  paymentMode: detail.payment_mode,
  createdAt: detail.createdAt,
  updatedAt: detail.updatedAt,
});

const toResponse = (payment) => ({
  id: payment.id,
  purchaseOrderId: payment.purchase_order_id,
  expenseId: payment.expense_id,
  posId: payment.pos_id,
  totalAmount: Number(payment.total_amount),
  status: payment.status,
  transactionReference: payment.transaction_reference || '',
  notes: payment.notes || '',
  paymentDate: payment.payment_date,
  details: (payment.details || []).map(toDetailResponse),
  purchaseOrder: payment.PurchaseOrder ? {
    id: payment.PurchaseOrder.id,
    poNumber: payment.PurchaseOrder.po_number,
    supplierName: payment.PurchaseOrder.supplier_name,
  } : null,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const getAll = async (req, res) => {
  try {
    const { purchaseOrderId, expenseId, posId, status } = req.query;
    const where = {};

    if (purchaseOrderId) where.purchase_order_id = purchaseOrderId;
    if (expenseId) where.expense_id = expenseId;
    if (posId) where.pos_id = posId;
    if (status) where.status = status;

    const payments = await Payment.findAll({
      where,
      include: [
        { model: PaymentDetail, as: 'details' },
        { model: PurchaseOrder, required: false },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(payments.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getOne = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: PaymentDetail, as: 'details' },
        { model: PurchaseOrder, required: false },
      ],
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });
    return res.json(toResponse(payment));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      purchaseOrderId,
      expenseId,
      posId,
      status,
      transactionReference,
      notes,
      paymentDate,
      details,
    } = req.body;

    // Validate at least one reference is provided
    const refCount = [purchaseOrderId, expenseId, posId].filter(Boolean).length;
    if (refCount === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one of purchaseOrderId, expenseId, or posId is required.' });
    }
    if (refCount > 1) {
      await t.rollback();
      return res.status(400).json({ message: 'Only one reference (purchaseOrderId, expenseId, or posId) should be provided.' });
    }

    // Validate details
    if (!Array.isArray(details) || details.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one payment detail is required.' });
    }

    // Calculate total from details
    let totalAmount = 0;
    const validModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
    const detailRows = details.map((d) => {
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

    const payment = await Payment.create({
      purchase_order_id: purchaseOrderId || null,
      expense_id: expenseId || null,
      pos_id: posId || null,
      total_amount: totalAmount,
      status: status || 'pending',
      transaction_reference: (transactionReference || '').trim() || null,
      notes: (notes || '').trim() || null,
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
    }, { transaction: t });

    await PaymentDetail.bulkCreate(
      detailRows.map((row) => ({ ...row, payment_id: payment.id })),
      { transaction: t }
    );

    await t.commit();

    const created = await Payment.findByPk(payment.id, {
      include: [
        { model: PaymentDetail, as: 'details' },
        { model: PurchaseOrder, required: false },
      ],
    });
    return res.status(201).json(toResponse(created));
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: PaymentDetail, as: 'details' },
        { model: PurchaseOrder, required: false },
      ],
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });

    await payment.update({ status });
    await payment.reload({
      include: [
        { model: PaymentDetail, as: 'details' },
        { model: PurchaseOrder, required: false },
      ],
    });
    return res.json(toResponse(payment));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payment = await Payment.findByPk(req.params.id, { transaction: t });
    if (!payment) { await t.rollback(); return res.status(404).json({ message: 'Payment not found.' }); }

    // Delete details first (though CASCADE should handle this)
    await PaymentDetail.destroy({ where: { payment_id: payment.id }, transaction: t });
    await payment.destroy({ transaction: t });
    
    await t.commit();
    return res.json({ message: 'Payment deleted successfully.' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get payments by purchase order (for PO integration)
const getByPurchaseOrder = async (req, res) => {
  try {
    const poId = req.params.id;
    
    // Verify PO exists
    const po = await PurchaseOrder.findByPk(poId);
    if (!po) return res.status(404).json({ message: 'Purchase order not found.' });

    const payments = await Payment.findAll({
      where: { purchase_order_id: poId },
      include: [
        { model: PaymentDetail, as: 'details' },
        { model: PurchaseOrder, required: false },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(payments.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getAll, getOne, create, updateStatus, remove, getByPurchaseOrder };
