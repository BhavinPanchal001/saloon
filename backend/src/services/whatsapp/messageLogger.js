const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', '..', 'whatsapp_logs.json');
const MAX_LOGS = 100;

let memoryLogs = [];

const loadLogs = () => {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const raw = fs.readFileSync(LOG_FILE, 'utf8');
      memoryLogs = JSON.parse(raw);
    }
  } catch (e) {
    memoryLogs = [];
  }
};

const persistLogs = () => {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(memoryLogs.slice(0, MAX_LOGS), null, 2), 'utf8');
  } catch (_) {}
};

loadLogs();

/**
 * Log a WhatsApp message dispatch attempt
 * @param {Object} entry
 */
const logMessage = ({
  invoiceNumber = null,
  customerName = null,
  recipientPhone,
  provider,
  type = 'invoice',
  status = 'sent', // 'sent' | 'failed' | 'simulated'
  messageId = null,
  error = null,
}) => {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    invoiceNumber: invoiceNumber || 'N/A',
    customerName: customerName || 'Valued Customer',
    recipientPhone,
    provider: provider || 'unknown',
    type,
    status,
    messageId,
    error: error ? String(error) : null,
    timestamp: new Date().toISOString(),
  };

  memoryLogs.unshift(logEntry);
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs = memoryLogs.slice(0, MAX_LOGS);
  }

  persistLogs();
  return logEntry;
};

/**
 * Get recent logs
 * @param {number} limit
 */
const getLogs = (limit = 50) => {
  return memoryLogs.slice(0, limit);
};

module.exports = {
  logMessage,
  getLogs,
};
