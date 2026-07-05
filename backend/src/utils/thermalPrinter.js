const fs = require('fs');
const path = require('path');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// Try to load network adapter (optional — may not be installed)
let escposNetwork = null;
try {
  escposNetwork = require('escpos-network');
} catch (_) {
  // escpos-network not installed — network printing not available
}

const CONFIG_FILE = path.join(__dirname, '../config/printerConfig.json');

// Default config structure
const defaultConfig = {
  enabled: process.env.THERMAL_PRINTER_ENABLED === 'true',
  connectionType: (process.env.THERMAL_PRINTER_TYPE || 'usb').toLowerCase(),
  vid: process.env.THERMAL_PRINTER_VID || '',
  pid: process.env.THERMAL_PRINTER_PID || '',
  ip: process.env.THERMAL_PRINTER_IP || '',
  port: process.env.THERMAL_PRINTER_PORT ? parseInt(process.env.THERMAL_PRINTER_PORT, 10) : 9100,
  paperWidth: 48, // 48 chars = 80mm paper, 32 chars = 58mm paper
};

// Read config from JSON file if exists, otherwise write defaults
let currentConfig = { ...defaultConfig };

const loadConfigFromFile = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(data);
      currentConfig = { ...defaultConfig, ...parsed };
    } else {
      // Ensure directory exists
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('[ThermalPrinter] Could not load printerConfig.json, using defaults:', err.message);
  }
};

loadConfigFromFile();

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
const padLine = (left, right, lineWidth = currentConfig.paperWidth || 48) => {
  const maxLeft = lineWidth - right.length - 1;
  const truncLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left;
  const spaces = lineWidth - truncLeft.length - right.length;
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
 * Open a printer device based on current configuration.
 * Returns the escpos device or throws an error.
 */
const openDevice = () => {
  if (currentConfig.connectionType === 'network') {
    if (!escposNetwork) {
      throw new Error('escpos-network package is not installed. Run: npm install escpos-network');
    }
    if (!currentConfig.ip) {
      throw new Error('Printer IP Address is not configured in printer settings.');
    }
    return new escposNetwork(currentConfig.ip, currentConfig.port || 9100);
  }

  // USB mode
  const vidInt = currentConfig.vid ? parseInt(currentConfig.vid, 16) : undefined;
  const pidInt = currentConfig.pid ? parseInt(currentConfig.pid, 16) : undefined;

  if (vidInt && pidInt) {
    return new escpos.USB(vidInt, pidInt);
  }
  return new escpos.USB();
};

/**
 * Get current printer status and config.
 */
const getPrinterStatus = () => {
  let deviceDetected = false;

  if (currentConfig.connectionType === 'usb') {
    try {
      const device = openDevice();
      deviceDetected = !!device;
    } catch (_) {
      deviceDetected = false;
    }
  } else if (currentConfig.connectionType === 'network') {
    deviceDetected = !!currentConfig.ip;
  }

  return {
    enabled: currentConfig.enabled,
    connectionType: currentConfig.connectionType,
    vid: currentConfig.vid ? currentConfig.vid.toUpperCase() : '',
    pid: currentConfig.pid ? currentConfig.pid.toUpperCase() : '',
    ip: currentConfig.ip || '',
    port: currentConfig.port || 9100,
    paperWidth: currentConfig.paperWidth || 48,
    networkSupported: !!escposNetwork,
    deviceDetected,
  };
};

/**
 * Save new printer configuration (saves to printerConfig.json and updates runtime state).
 */
const savePrinterConfig = (newConfig = {}) => {
  if (typeof newConfig.enabled === 'boolean') {
    currentConfig.enabled = newConfig.enabled;
  }
  if (newConfig.connectionType === 'usb' || newConfig.connectionType === 'network') {
    currentConfig.connectionType = newConfig.connectionType;
  }
  if (typeof newConfig.vid === 'string') {
    currentConfig.vid = newConfig.vid.replace(/^0x/i, '').trim();
  }
  if (typeof newConfig.pid === 'string') {
    currentConfig.pid = newConfig.pid.replace(/^0x/i, '').trim();
  }
  if (typeof newConfig.ip === 'string') {
    currentConfig.ip = newConfig.ip.trim();
  }
  if (newConfig.port) {
    currentConfig.port = Number(newConfig.port) || 9100;
  }
  if (newConfig.paperWidth) {
    currentConfig.paperWidth = Number(newConfig.paperWidth) || 48;
  }

  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf8');
    console.log('[ThermalPrinter] Saved new printer settings to printerConfig.json:', currentConfig);
  } catch (err) {
    console.error('[ThermalPrinter] Failed to save config file:', err);
  }

  return getPrinterStatus();
};

/**
 * Toggle printer enabled state at runtime.
 */
const setPrinterEnabled = (enabled) => {
  return savePrinterConfig({ enabled: !!enabled });
};

/**
 * Set connection type at runtime ('usb' or 'network').
 */
const setConnectionType = (type) => {
  return savePrinterConfig({ connectionType: type });
};

/**
 * Helper: execute a print job on a given device.
 */
const executePrint = (device, printFn) => {
  const lineWidth = currentConfig.paperWidth || 48;
  const options = { encoding: 'GB18030', width: lineWidth };
  const printer = new escpos.Printer(device, options);

  return new Promise((resolve) => {
    device.open((err) => {
      if (err) {
        console.warn('[ThermalPrinter] Failed to open printer:', err.message);
        resolve({ success: false, reason: 'open_failed', message: err.message });
        return;
      }

      try {
        const separator = '='.repeat(lineWidth);
        const dashLine = '-'.repeat(lineWidth);

        printFn(printer, separator, dashLine, lineWidth);

        printer
          .cut()
          .close(() => {
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
 * Print a receipt for the given bill data.
 */
const printReceipt = async (billData) => {
  if (!currentConfig.enabled) {
    console.log('[ThermalPrinter] Printing is disabled.');
    return { success: false, reason: 'disabled' };
  }

  let device;
  try {
    device = openDevice();
  } catch (err) {
    console.warn(`[ThermalPrinter] ${currentConfig.connectionType} printer not available:`, err.message);
    return { success: false, reason: 'not_connected', message: err.message };
  }

  const result = await executePrint(device, (printer, separator, dashLine, lineWidth) => {
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
      .text(padLine(`Bill#: ${billData.billNumber}`, '', lineWidth))
      .text(padLine(`Date : ${formatDate(billData.createdAt)}`, formatTime(billData.createdAt), lineWidth))
      .text(padLine(`Outlet: ${billData.outletName || '--'}`, '', lineWidth))
      .text(padLine(`Customer: ${billData.customer?.name || 'Walk-in'}`, '', lineWidth))
      .text(dashLine);

    // Column header
    printer.text(padLine('# Item', 'Qty   Amount', lineWidth));
    printer.text(dashLine);

    // Line items
    if (billData.lineItems && billData.lineItems.length > 0) {
      billData.lineItems.forEach((item, idx) => {
        const num = `${idx + 1} `;
        const name = item.itemName || 'Item';
        const qty = String(item.qty || 1);
        const amount = formatCurrency(Number(item.price || 0) * Number(item.qty || 1));
        const rightPart = `${qty.padStart(3)}  ${amount}`;
        const maxName = lineWidth - num.length - rightPart.length - 1;
        const truncName = name.length > maxName ? name.substring(0, maxName) : name;
        const line = num + truncName + ' '.repeat(Math.max(lineWidth - num.length - truncName.length - rightPart.length, 1)) + rightPart;
        printer.text(line);
      });
    }

    printer.text(dashLine);

    // Totals
    printer.text(padLine('Subtotal:', formatCurrency(billData.subtotal), lineWidth));
    if (billData.discountAmount && Number(billData.discountAmount) > 0) {
      printer.text(padLine('Discount:', `-${formatCurrency(billData.discountAmount)}`, lineWidth));
    }
    printer.text(padLine('Tax (8%):', formatCurrency(billData.tax), lineWidth));
    printer.text(separator);
    printer
      .style('b')
      .text(padLine('TOTAL:', formatCurrency(billData.total), lineWidth))
      .style('normal');
    printer.text(padLine('Payment:', billData.paymentMethod || '--', lineWidth));
    printer.text(separator);

    // Footer
    printer
      .align('ct')
      .text('')
      .text('Thank you for visiting!')
      .text('See you soon!')
      .text('')
      .text(separator);
  });

  if (result.success) {
    console.log('[ThermalPrinter] Receipt printed successfully for bill:', billData.billNumber);
  }
  return result;
};

/**
 * Print a small test receipt to verify the printer is working.
 */
const printTestReceipt = async () => {
  if (!currentConfig.enabled) {
    return { success: false, reason: 'disabled' };
  }

  let device;
  try {
    device = openDevice();
  } catch (err) {
    return { success: false, reason: 'not_connected', message: err.message };
  }

  const result = await executePrint(device, (printer, separator) => {
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
      .text(`Mode: ${currentConfig.connectionType.toUpperCase()}`)
      .text('')
      .text('Your thermal printer is working!')
      .text('')
      .text(separator);
  });

  if (result.success) {
    console.log('[ThermalPrinter] Test receipt printed successfully.');
  }
  return result;
};

module.exports = {
  printReceipt,
  getPrinterStatus,
  setPrinterEnabled,
  setConnectionType,
  savePrinterConfig,
  printTestReceipt,
};
