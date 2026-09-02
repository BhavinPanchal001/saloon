const {
  getPrinterStatus,
  setPrinterEnabled,
  setConnectionType,
  savePrinterConfig,
  printTestReceipt,
} = require('../utils/thermalPrinter');

/**
 * GET /api/printer/status
 * Returns current printer configuration and status.
 */
const getStatus = async (req, res) => {
  try {
    const status = getPrinterStatus();
    return res.json(status);
  } catch (err) {
    console.error('[PrinterSettings] Error getting status:', err);
    return res.status(500).json({ message: 'Failed to get printer status.' });
  }
};

/**
 * POST /api/printer/toggle
 * Toggle thermal printer enabled/disabled at runtime.
 * Body: { enabled: true | false }
 */
const toggle = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: '"enabled" (boolean) is required.' });
    }

    const status = setPrinterEnabled(enabled);
    return res.json({ message: `Printing ${enabled ? 'enabled' : 'disabled'}.`, ...status });
  } catch (err) {
    console.error('[PrinterSettings] Error toggling:', err);
    return res.status(500).json({ message: 'Failed to toggle printer.' });
  }
};

const VALID_CONNECTION_TYPES = ['usb', 'network', 'bluetooth', 'serial'];

/**
 * POST /api/printer/connection-type
 * Switch between 'usb', 'network', or 'bluetooth' connection at runtime.
 * Body: { type: 'usb' | 'network' | 'bluetooth' }
 */
const switchConnectionType = async (req, res) => {
  try {
    const type = req.body.type || req.body.connectionType;
    if (!type || !VALID_CONNECTION_TYPES.includes(type)) {
      return res.status(400).json({ message: `"type" must be one of: ${VALID_CONNECTION_TYPES.join(', ')}.` });
    }

    const status = setConnectionType(type);
    return res.json({ message: `Connection type set to ${type}.`, ...status });
  } catch (err) {
    console.error('[PrinterSettings] Error switching connection type:', err);
    return res.status(500).json({ message: 'Failed to switch connection type.' });
  }
};

/**
 * PUT /api/printer/settings (or POST)
 * Save full thermal printer settings from UI form.
 * Body: { enabled, connectionType, vid, pid, ip, port, comPort, baudRate, paperWidth }
 */
const saveSettings = async (req, res) => {
  try {
    const { enabled, connectionType, vid, pid, ip, port, comPort, baudRate, paperWidth } = req.body;

    const updatedStatus = savePrinterConfig({
      enabled,
      connectionType,
      vid,
      pid,
      ip,
      port,
      comPort,
      baudRate,
      paperWidth,
    });

    return res.json({
      message: 'Printer settings saved successfully!',
      ...updatedStatus,
    });
  } catch (err) {
    console.error('[PrinterSettings] Error saving settings:', err);
    return res.status(500).json({ message: 'Failed to save printer settings.' });
  }
};

/**
 * POST /api/printer/test-print
 * Send a small test receipt to verify the printer is working.
 */
const testPrint = async (req, res) => {
  try {
    const result = await printTestReceipt();

    if (result.success) {
      return res.json({ message: 'Test receipt printed successfully!', success: true });
    }

    // Map reason to user-friendly message
    const messages = {
      disabled: 'Printing is disabled. Enable it first in Settings.',
      not_connected: 'Printer not reachable. Check your settings and physical cable/network connection. ' + (result.message || ''),
      open_failed: 'Could not open the printer. It may be in use.',
      print_error: 'Printing error: ' + (result.message || 'Unknown'),
    };

    return res.status(422).json({
      message: messages[result.reason] || 'Test print failed.',
      success: false,
      reason: result.reason,
    });
  } catch (err) {
    console.error('[PrinterSettings] Error test printing:', err);
    return res.status(500).json({ message: 'Failed to test print.' });
  }
};

module.exports = {
  getStatus,
  toggle,
  switchConnectionType,
  saveSettings,
  testPrint,
};
