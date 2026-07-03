const { getPrinterStatus, setPrinterEnabled, printTestReceipt } = require('../utils/thermalPrinter');

/**
 * GET /api/printer/status
 * Returns current printer configuration and whether a USB device is detected.
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

    const newState = setPrinterEnabled(enabled);
    const status = getPrinterStatus();
    return res.json({ message: `Printing ${newState ? 'enabled' : 'disabled'}.`, ...status });
  } catch (err) {
    console.error('[PrinterSettings] Error toggling:', err);
    return res.status(500).json({ message: 'Failed to toggle printer.' });
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
      not_connected: 'No USB printer detected. Check the connection.',
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

module.exports = { getStatus, toggle, testPrint };
