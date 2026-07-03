const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// Runtime-toggleable state (initialized from env, can be changed via API)
let printerEnabled = process.env.THERMAL_PRINTER_ENABLED === 'true';
const PRINTER_VID = process.env.THERMAL_PRINTER_VID ? parseInt(process.env.THERMAL_PRINTER_VID, 16) : undefined;
const PRINTER_PID = process.env.THERMAL_PRINTER_PID ? parseInt(process.env.THERMAL_PRINTER_PID, 16) : undefined;

const LINE_WIDTH = 48; // 80mm paper = 48 chars per line

/**
 * Format currency in INR
 */
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `Rs.${num.toFixed(2)}`;
};

/**
 * Pad/align text for receipt columns
 */
const padLine = (left, right) => {
  const maxLeft = LINE_WIDTH - right.length - 1;
  const truncLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left;
  const spaces = LINE_WIDTH - truncLeft.length - right.length;
  return truncLeft + ' '.repeat(Math.max(spaces, 1)) + right;
};

/**
 * Format date for receipt
 */
const formatDate = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Format time for receipt
 */
const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Try to open a USB device. Returns the device or throws.
 */
const openUSBDevice = () => {
  if (PRINTER_VID && PRINTER_PID) {
    return new escpos.USB(PRINTER_VID, PRINTER_PID);
  }
  return new escpos.USB();
};

/**
 * Get current printer status.
 */
const getPrinterStatus = () => {
  let deviceDetected = false;
  try {
    const device = openUSBDevice();
    deviceDetected = !!device;
  } catch (_) {
    deviceDetected = false;
  }

  return {
    enabled: printerEnabled,
    vid: PRINTER_VID ? PRINTER_VID.toString(16).toUpperCase() : null,
    pid: PRINTER_PID ? PRINTER_PID.toString(16).toUpperCase() : null,
    deviceDetected,
  };
};

/**
 * Toggle printer enabled state at runtime.
 */
const setPrinterEnabled = (enabled) => {
  printerEnabled = !!enabled;
  console.log(`[ThermalPrinter] Printing ${printerEnabled ? 'ENABLED' : 'DISABLED'} (runtime toggle).`);
  return printerEnabled;
};

/**
 * Print a receipt for the given bill data.
 * billData shape matches the checkout response:
 * { billNumber, createdAt, customer: { name, phone }, outletName, lineItems, subtotal, discountAmount, tax, total, paymentMethod }
 */
const printReceipt = async (billData) => {
  if (!printerEnabled) {
    console.log('[ThermalPrinter] Printing disabled via env.');
    return { success: false, reason: 'disabled' };
  }

  let device;
  try {
    device = openUSBDevice();
  } catch (err) {
    console.warn('[ThermalPrinter] USB printer not found or not connected:', err.message);
    return { success: false, reason: 'not_connected', message: err.message };
  }

  const options = { encoding: 'GB18030', width: LINE_WIDTH };
  const printer = new escpos.Printer(device, options);

  return new Promise((resolve) => {
    device.open((err) => {
      if (err) {
        console.warn('[ThermalPrinter] Failed to open printer:', err.message);
        resolve({ success: false, reason: 'open_failed', message: err.message });
        return;
      }

      try {
        const separator = '='.repeat(LINE_WIDTH);
        const dashLine = '-'.repeat(LINE_WIDTH);

        printer
          .font('a')
          .align('ct')
          .style('b')
          .size(1, 1)
          .text('GLOWY')
          .style('normal')
          .size(0, 0)
          .text('Glow to go with Glowy')
          .text(separator)
          .align('ct')
          .text('42, Brigade Road, Bengaluru')
          .text('Ph: +91 80 4567 8900')
          .text('GSTIN: 29AABCG1234F1ZP')
          .text(dashLine)
          .align('lt');

        // Bill info
        printer
          .text(padLine(`Bill#: ${billData.billNumber}`, ''))
          .text(padLine(`Date : ${formatDate(billData.createdAt)}`, formatTime(billData.createdAt)))
          .text(padLine(`Outlet: ${billData.outletName || '--'}`, ''))
          .text(padLine(`Customer: ${billData.customer?.name || 'Walk-in'}`, ''))
          .text(dashLine);

        // Column header
        printer.text(padLine('# Item', 'Qty   Amount'));
        printer.text(dashLine);

        // Line items
        if (billData.lineItems && billData.lineItems.length > 0) {
          billData.lineItems.forEach((item, idx) => {
            const num = `${idx + 1} `;
            const name = item.itemName || 'Item';
            const qty = String(item.qty || 1);
            const amount = formatCurrency(Number(item.price || 0) * Number(item.qty || 1));
            const rightPart = `${qty.padStart(3)}  ${amount}`;
            const maxName = LINE_WIDTH - num.length - rightPart.length - 1;
            const truncName = name.length > maxName ? name.substring(0, maxName) : name;
            const line = num + truncName + ' '.repeat(Math.max(LINE_WIDTH - num.length - truncName.length - rightPart.length, 1)) + rightPart;
            printer.text(line);
          });
        }

        printer.text(dashLine);

        // Totals
        printer.text(padLine('Subtotal:', formatCurrency(billData.subtotal)));
        if (billData.discountAmount && Number(billData.discountAmount) > 0) {
          printer.text(padLine('Discount:', `-${formatCurrency(billData.discountAmount)}`));
        }
        printer.text(padLine('Tax (8%):', formatCurrency(billData.tax)));
        printer.text(separator);
        printer
          .style('b')
          .text(padLine('TOTAL:', formatCurrency(billData.total)))
          .style('normal');
        printer.text(padLine('Payment:', billData.paymentMethod || '--'));
        printer.text(separator);

        // Footer
        printer
          .align('ct')
          .text('')
          .text('Thank you for visiting!')
          .text('See you soon!')
          .text('')
          .text(separator);

        // Cut paper
        printer
          .cut()
          .close(() => {
            console.log('[ThermalPrinter] Receipt printed successfully for bill:', billData.billNumber);
            resolve({ success: true });
          });
      } catch (printErr) {
        console.error('[ThermalPrinter] Error during printing:', printErr.message);
        try { device.close(); } catch (_) { /* ignore */ }
        resolve({ success: false, reason: 'print_error', message: printErr.message });
      }
    });
  });
};

/**
 * Print a small test receipt to verify the printer is working.
 */
const printTestReceipt = async () => {
  if (!printerEnabled) {
    return { success: false, reason: 'disabled' };
  }

  let device;
  try {
    device = openUSBDevice();
  } catch (err) {
    return { success: false, reason: 'not_connected', message: err.message };
  }

  const options = { encoding: 'GB18030', width: LINE_WIDTH };
  const printer = new escpos.Printer(device, options);

  return new Promise((resolve) => {
    device.open((err) => {
      if (err) {
        resolve({ success: false, reason: 'open_failed', message: err.message });
        return;
      }

      try {
        const separator = '='.repeat(LINE_WIDTH);
        const now = new Date();

        printer
          .font('a')
          .align('ct')
          .style('b')
          .size(1, 1)
          .text('GLOWY')
          .style('normal')
          .size(0, 0)
          .text('Glow to go with Glowy')
          .text(separator)
          .text('')
          .style('b')
          .text('*** TEST PRINT ***')
          .style('normal')
          .text('')
          .text(`Date: ${now.toLocaleDateString('en-IN')}`)
          .text(`Time: ${now.toLocaleTimeString('en-IN')}`)
          .text('')
          .text('Your thermal printer is working!')
          .text('')
          .text(separator)
          .cut()
          .close(() => {
            console.log('[ThermalPrinter] Test receipt printed successfully.');
            resolve({ success: true });
          });
      } catch (printErr) {
        try { device.close(); } catch (_) { /* ignore */ }
        resolve({ success: false, reason: 'print_error', message: printErr.message });
      }
    });
  });
};

module.exports = { printReceipt, getPrinterStatus, setPrinterEnabled, printTestReceipt };
