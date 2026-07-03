const { Bill, BillLineItem, Outlet } = require('../models');
const { printReceipt } = require('../utils/thermalPrinter');

/**
 * POST /api/pos/print-receipt/:billId
 * Reprint a receipt for an existing bill.
 */
const printBillReceipt = async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await Bill.findByPk(billId, {
      include: [
        { model: BillLineItem, as: 'lineItems' },
      ],
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    const outlet = await Outlet.findByPk(bill.outlet_id);

    const billData = {
      billNumber: bill.bill_number,
      createdAt: bill.createdAt,
      customer: {
        name: bill.customer_name,
        phone: bill.customer_phone,
      },
      outletName: outlet?.name || '--',
      paymentMethod: bill.payment_method,
      subtotal: Number(bill.subtotal),
      discountAmount: Number(bill.discount_amount),
      tax: Number(bill.tax),
      total: Number(bill.total),
      lineItems: (bill.lineItems || []).map((li) => ({
        itemName: li.item_name,
        qty: li.qty,
        price: Number(li.price),
      })),
    };

    const result = await printReceipt(billData);

    if (result && result.success) {
      return res.json({ message: 'Receipt sent to printer.', success: true });
    }

    // Map reason to user-friendly message
    const messages = {
      disabled: 'Printing is disabled. Enable it in Printer Settings.',
      not_connected: 'No USB printer detected. Check the connection.',
      open_failed: 'Could not open the printer. It may be in use.',
      print_error: 'Printing error: ' + (result?.message || 'Unknown'),
    };

    return res.status(422).json({
      message: messages[result?.reason] || 'Print failed.',
      success: false,
      reason: result?.reason,
    });
  } catch (err) {
    console.error('[PrintController] Error printing receipt:', err);
    return res.status(500).json({ message: 'Failed to print receipt.' });
  }
};

module.exports = { printBillReceipt };
