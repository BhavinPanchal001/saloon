/**
 * Web Bluetooth ESC/POS Thermal Receipt Printer Driver
 * Supports 58mm (32 chars) and 80mm (48 chars) Bluetooth thermal printers
 * (Goojprt, MPT-II, POS-58, POS-80, Epson, Xprinter, MUNBYN, Netum, Zywell, etc.)
 *
 * Features:
 * - Persistent pairing across page refreshes via navigator.bluetooth.getDevices()
 * - Auto-reconnect on page load & lazy reconnect before print
 * - Chunked transmission with safe BLE MTU
 * - 58mm & 80mm ESC/POS formatting
 */

// Common Bluetooth GATT Service UUIDs used by POS Thermal Printers
const COMMON_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Bluetooth Print Service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common ESC/POS Custom Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // BLE Serial Port Service
  '0000ae00-0000-1000-8000-00805f9b34fb', // Common POS Serial Service
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
  '0000af00-0000-1000-8000-00805f9b34fb',
];

import { COMPANY_INFO } from './companyInfo';

// In-memory state
let bluetoothDevice = null;
let characteristicWrite = null;
let isConnecting = false;
let listeners = new Set();

const notifyStateChange = () => {
  const status = getBluetoothPrinterStatus();
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.error('[BluetoothPrinter] Listener error:', e);
    }
  });
};

/**
 * Check if Web Bluetooth API is supported in current browser
 */
export const isBluetoothSupported = () => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

/**
 * Get current Bluetooth printer status
 */
export const getBluetoothPrinterStatus = () => {
  const isConnected = !!(bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected && characteristicWrite);
  const storedName = localStorage.getItem('glowy_bt_printer_name');
  const autoConnect = localStorage.getItem('glowy_bt_auto_connect') === 'true';

  return {
    supported: isBluetoothSupported(),
    connected: isConnected,
    isConnecting,
    deviceName: bluetoothDevice ? bluetoothDevice.name || 'Bluetooth POS Printer' : (storedName || null),
    deviceId: bluetoothDevice ? bluetoothDevice.id : (localStorage.getItem('glowy_bt_device_id') || null),
    hasPairedDevice: !!(storedName && autoConnect),
  };
};

/**
 * Subscribe to Bluetooth printer connection status changes
 */
export const onPrinterStateChange = (callback) => {
  listeners.add(callback);
  callback(getBluetoothPrinterStatus());
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Helper: Connect GATT Server & discover write characteristic on a given BluetoothDevice
 */
const setupDeviceConnection = async (device) => {
  bluetoothDevice = device;
  localStorage.setItem('glowy_bt_printer_name', device.name || 'Bluetooth POS Printer');
  localStorage.setItem('glowy_bt_device_id', device.id);
  localStorage.setItem('glowy_bt_auto_connect', 'true');

  device.removeEventListener('gattserverdisconnected', handleDisconnectEvent);
  device.addEventListener('gattserverdisconnected', handleDisconnectEvent);

  console.log('[BluetoothPrinter] Connecting to GATT server for:', device.name);
  const server = await device.gatt.connect();

  let targetChar = null;

  // 1. Check known primary services
  for (const serviceUuid of COMMON_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      if (service) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            targetChar = char;
            break;
          }
        }
      }
    } catch (_) {}
    if (targetChar) break;
  }

  // 2. Query all primary services if not found
  if (!targetChar) {
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetChar = char;
              break;
            }
          }
        } catch (_) {}
        if (targetChar) break;
      }
    } catch (err) {
      console.warn('[BluetoothPrinter] Could not enumerate services:', err);
    }
  }

  if (!targetChar) {
    device.gatt.disconnect();
    throw new Error('Could not find a writable ESC/POS printing channel on this device.');
  }

  characteristicWrite = targetChar;
  console.log('[BluetoothPrinter] Connection established successfully with:', device.name);
  notifyStateChange();

  return {
    success: true,
    deviceName: device.name || 'Bluetooth POS Printer',
    deviceId: device.id,
  };
};

const handleDisconnectEvent = () => {
  console.warn('[BluetoothPrinter] GATT server disconnected.');
  characteristicWrite = null;
  notifyStateChange();
};

/**
 * Auto-reconnect to previously paired Bluetooth printer (called on page load/refresh)
 */
export const autoReconnectBluetoothPrinter = async () => {
  if (!isBluetoothSupported() || isConnecting) return false;
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected && characteristicWrite) {
    return true;
  }

  const autoConnect = localStorage.getItem('glowy_bt_auto_connect') === 'true';
  const storedId = localStorage.getItem('glowy_bt_device_id');
  const storedName = localStorage.getItem('glowy_bt_printer_name');

  if (!autoConnect || (!storedId && !storedName)) {
    return false;
  }

  if (typeof navigator.bluetooth.getDevices !== 'function') {
    return false;
  }

  isConnecting = true;
  notifyStateChange();

  try {
    const devices = await navigator.bluetooth.getDevices();
    if (!devices || devices.length === 0) {
      console.log('[BluetoothPrinter] No previously authorized Bluetooth devices found in browser.');
      return false;
    }

    // Match by ID or Name or pick the first authorized device
    const targetDevice = devices.find((d) => (storedId && d.id === storedId) || (storedName && d.name === storedName)) || devices[0];

    if (!targetDevice) {
      return false;
    }

    console.log('[BluetoothPrinter] Auto-reconnecting to previously paired device:', targetDevice.name);
    await setupDeviceConnection(targetDevice);
    return true;
  } catch (err) {
    console.warn('[BluetoothPrinter] Auto-reconnect failed:', err.message);
    return false;
  } finally {
    isConnecting = false;
    notifyStateChange();
  }
};

/**
 * Request user to select and connect to Bluetooth POS Thermal Printer
 */
export const connectBluetoothPrinter = async () => {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.');
  }

  // Disconnect existing session if any
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
    try {
      bluetoothDevice.gatt.disconnect();
    } catch (_) {}
  }

  isConnecting = true;
  notifyStateChange();

  try {
    console.log('[BluetoothPrinter] Scanning for Bluetooth POS printer...');
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { services: ['0000ff00-0000-1000-8000-00805f9b34fb'] },
        { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
        { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },
        { services: ['0000ae00-0000-1000-8000-00805f9b34fb'] },
        { services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] },
      ],
      optionalServices: COMMON_SERVICE_UUIDS,
      acceptAllDevices: false,
    }).catch(async (err) => {
      if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
        throw err;
      }
      console.warn('[BluetoothPrinter] Filtered request failed, trying acceptAllDevices...', err);
      return await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: COMMON_SERVICE_UUIDS,
      });
    });

    if (!device) {
      throw new Error('No Bluetooth printer selected.');
    }

    return await setupDeviceConnection(device);
  } catch (err) {
    console.error('[BluetoothPrinter] Connection error:', err);
    throw err;
  } finally {
    isConnecting = false;
    notifyStateChange();
  }
};

/**
 * Disconnect active Bluetooth printer
 */
export const disconnectBluetoothPrinter = () => {
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
    try {
      bluetoothDevice.gatt.disconnect();
    } catch (e) {
      console.warn('[BluetoothPrinter] Disconnect error:', e);
    }
  }
  bluetoothDevice = null;
  characteristicWrite = null;
  localStorage.setItem('glowy_bt_auto_connect', 'false');
  localStorage.removeItem('glowy_bt_printer_name');
  localStorage.removeItem('glowy_bt_device_id');
  notifyStateChange();
};

/**
 * Ensure active GATT connection before sending print bytes
 */
const ensureConnected = async () => {
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected && characteristicWrite) {
    return true;
  }
  // Try auto-reconnect silently
  const reconnected = await autoReconnectBluetoothPrinter();
  if (reconnected && characteristicWrite) {
    return true;
  }
  throw new Error('Bluetooth printer is not connected. Please click "Scan & Connect Printer" in Settings or Receipt Preview.');
};

/**
 * Helper: Chunk and send raw byte buffer over Bluetooth LE characteristic
 */
const sendRawBytes = async (byteArray) => {
  await ensureConnected();

  const CHUNK_SIZE = 100;
  const uint8 = new Uint8Array(byteArray);

  for (let offset = 0; offset < uint8.length; offset += CHUNK_SIZE) {
    const chunk = uint8.slice(offset, offset + CHUNK_SIZE);
    if (characteristicWrite.properties.writeWithoutResponse) {
      await characteristicWrite.writeValueWithoutResponse(chunk);
    } else {
      await characteristicWrite.writeValueWithResponse(chunk);
    }
    // Small delay to prevent buffer overflows
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

/**
 * ESC/POS Command Encoder Helper
 */
class EscPosEncoder {
  constructor(paperWidth = 48) {
    this.buffer = [];
    this.paperWidth = Number(paperWidth) || 48; // 48 = 80mm, 32 = 58mm
  }

  raw(bytes) {
    this.buffer.push(...bytes);
    return this;
  }

  init() {
    return this.raw([0x1b, 0x40]);
  }

  align(alignment = 'left') {
    let n = 0;
    if (alignment === 'center' || alignment === 'ct') n = 1;
    else if (alignment === 'right' || alignment === 'rt') n = 2;
    return this.raw([0x1b, 0x61, n]);
  }

  bold(enable = true) {
    return this.raw([0x1b, 0x45, enable ? 1 : 0]);
  }

  size(widthMultiplier = 1, heightMultiplier = 1) {
    const w = Math.max(1, Math.min(widthMultiplier, 8)) - 1;
    const h = Math.max(1, Math.min(heightMultiplier, 8)) - 1;
    const n = (w << 4) | h;
    return this.raw([0x1d, 0x21, n]);
  }

  text(str = '') {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    this.buffer.push(...encoded);
    return this;
  }

  line(str = '') {
    this.text(str);
    return this.raw([0x0a]);
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.raw([0x0a]);
    }
    return this;
  }

  separator(char = '=') {
    return this.line(char.repeat(this.paperWidth));
  }

  dashLine(char = '-') {
    return this.line(char.repeat(this.paperWidth));
  }

  padRow(left = '', right = '') {
    const leftStr = String(left || '');
    const rightStr = String(right || '');
    const maxLeft = this.paperWidth - rightStr.length - 1;
    const truncLeft = leftStr.length > maxLeft ? leftStr.substring(0, maxLeft) : leftStr;
    const spaces = Math.max(this.paperWidth - truncLeft.length - rightStr.length, 1);
    return this.line(truncLeft + ' '.repeat(spaces) + rightStr);
  }

  cut() {
    return this.feed(3).raw([0x1d, 0x56, 0x42, 0x00]);
  }

  tableRow(itemText, qtyText, amountText) {
    const is58 = this.paperWidth <= 32;
    const itemColWidth = is58 ? 15 : 26;
    const qtyColWidth = is58 ? 4 : 6;
    const amtColWidth = is58 ? 13 : 16;

    const qtyStr = String(qtyText).padStart(qtyColWidth);
    const amtStr = String(amountText).padStart(amtColWidth);

    if (itemText.length <= itemColWidth) {
      this.line(itemText.padEnd(itemColWidth) + qtyStr + amtStr);
    } else {
      const firstChunk = itemText.substring(0, itemColWidth);
      this.line(firstChunk.padEnd(itemColWidth) + qtyStr + amtStr);

      let remaining = itemText.substring(itemColWidth).trim();
      while (remaining.length > 0) {
        const wrapChunk = remaining.substring(0, itemColWidth - 2);
        remaining = remaining.substring(itemColWidth - 2).trim();
        this.line('  ' + wrapChunk);
      }
    }
    return this;
  }

  getBytes() {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Format amount with RM (Malaysian Ringgit)
 */
const formatAmt = (amount) => {
  const num = Number(amount) || 0;
  return `RM ${num.toFixed(2)}`;
};

/**
 * Format date for receipt
 */
const formatDate = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
 * Print receipt on connected Bluetooth POS Thermal Printer
 */
export const printBluetoothReceipt = async (billData, options = {}) => {
  const paperWidth = options.paperWidth || (localStorage.getItem('glowy_printer_paper_width') ? parseInt(localStorage.getItem('glowy_printer_paper_width'), 10) : 48);
  const encoder = new EscPosEncoder(paperWidth);

  const brandName = COMPANY_INFO.name || 'GLOWY';
  const tagline = COMPANY_INFO.tagline || 'Glow to go with Glowy';
  const address = billData.outlet?.address || billData.outlet_address || COMPANY_INFO.address;
  const phone = billData.outlet?.phone || billData.outlet_phone || COMPANY_INFO.phone;
  const taxNum = COMPANY_INFO.taxNumber || COMPANY_INFO.gstin || '';

  encoder
    .init()
    .align('center')
    .bold(true)
    .size(2, 2)
    .line(brandName.toUpperCase())
    .size(1, 1)
    .bold(false);

  if (tagline) encoder.line(tagline);
  encoder.separator('=');

  if (address) encoder.line(address);
  if (phone) encoder.line(`Ph: ${phone}`);
  if (taxNum) encoder.line(`SST/Reg: ${taxNum}`);

  const items = billData.lineItems || billData.line_items || [];
  const talents = [
    ...new Set(
      [
        billData.servedBy,
        billData.served_by,
        billData.staffName,
        ...items.map((it) => it.staffAssigned || it.staff_assigned || it.staffName),
      ].filter(Boolean)
    ),
  ];
  const servedByStr = talents.join(', ');

  // Bill metadata
  encoder
    .padRow(`Bill#: ${billData.billNumber || billData.bill_number || '--'}`, '')
    .padRow(`Date : ${formatDate(billData.createdAt || billData.created_at)}`, formatTime(billData.createdAt || billData.created_at))
    .padRow(`Outlet: ${billData.outletName || billData.outlet_name || '--'}`, '')
    .padRow(`Customer: ${billData.customer?.name || billData.customer_name || 'Walk-in'}`, '');

  if (servedByStr) {
    encoder.padRow(`Served by: ${servedByStr}`, '');
  }

  encoder.dashLine('-');

  // Items table with fixed column alignment
  encoder.tableRow('# Item', 'Qty', 'Amount').dashLine('-');

  if (items.length > 0) {
    items.forEach((item, idx) => {
      const num = `${idx + 1} `;
      const name = item.itemName || item.item_name || 'Item';
      const qty = String(item.qty || 1);
      const amount = formatAmt(Number(item.price || 0) * Number(item.qty || 1));
      encoder.tableRow(num + name, qty, amount);

      const talent = item.staffAssigned || item.staff_assigned || item.staffName;
      if (talent) {
        encoder.line(`   Served by: ${talent}`);
      }
    });
  }

  encoder.dashLine('-');

  // Totals
  encoder.padRow('Subtotal:', formatAmt(billData.subtotal));
  if (billData.discountAmount && Number(billData.discountAmount) > 0) {
    encoder.padRow('Discount:', `-${formatAmt(billData.discountAmount)}`);
  }
  if (billData.tax && Number(billData.tax) > 0) {
    encoder.padRow('Tax / GST:', formatAmt(billData.tax));
  }
  encoder.separator('=');

  encoder
    .bold(true)
    .padRow('TOTAL:', formatAmt(billData.total))
    .bold(false);

  encoder.padRow('Payment:', (billData.paymentMethod || billData.payment_method || '--').toUpperCase());
  encoder.separator('=');

  // Footer
  encoder
    .align('center')
    .feed(1)
    .line(COMPANY_INFO.receiptFooter || 'Thank you for visiting!');

  if (COMPANY_INFO.terms) {
    const termLines = String(COMPANY_INFO.terms).split('\n');
    termLines.forEach((tLine) => {
      const trimmed = tLine.trim();
      if (!trimmed) return;
      const words = trimmed.split(' ');
      let curLine = '';
      words.forEach((w) => {
        if ((curLine + ' ' + w).trim().length <= paperWidth) {
          curLine = (curLine + ' ' + w).trim();
        } else {
          if (curLine) encoder.line(curLine);
          curLine = w;
        }
      });
      if (curLine) encoder.line(curLine);
    });
  } else {
    encoder.line('See you soon!');
  }

  encoder
    .feed(1)
    .separator('=')
    .cut();

  await sendRawBytes(encoder.getBytes());
  return { success: true, message: 'Receipt printed via Bluetooth printer ✓' };
};

/**
 * Print a test diagnostic receipt over Bluetooth
 */
export const printBluetoothTestReceipt = async (options = {}) => {
  const paperWidth = options.paperWidth || (localStorage.getItem('glowy_printer_paper_width') ? parseInt(localStorage.getItem('glowy_printer_paper_width'), 10) : 48);
  const encoder = new EscPosEncoder(paperWidth);
  const now = new Date();

  encoder
    .init()
    .align('center')
    .bold(true)
    .size(2, 2)
    .line('GLOWY')
    .size(1, 1)
    .bold(false)
    .line('Glow to go with Glowy')
    .separator('=')
    .feed(1)
    .bold(true)
    .line('*** BLUETOOTH TEST PRINT ***')
    .bold(false)
    .feed(1)
    .line(`Date: ${now.toLocaleDateString('en-IN')}`)
    .line(`Time: ${now.toLocaleTimeString('en-IN')}`)
    .line(`Mode: BLUETOOTH (Web Bluetooth API)`)
    .line(`Paper: ${Number(paperWidth) === 32 ? '58mm (32 cols)' : '80mm (48 cols)'}`)
    .feed(1)
    .line('Your Bluetooth thermal printer')
    .line('is connected and working perfectly!')
    .feed(1)
    .separator('=')
    .cut();

  await sendRawBytes(encoder.getBytes());
  return { success: true, message: 'Bluetooth test receipt printed successfully!' };
};

// Initiate auto-reconnect on initial script load if supported
if (typeof window !== 'undefined' && isBluetoothSupported()) {
  setTimeout(() => {
    autoReconnectBluetoothPrinter().catch(() => {});
  }, 500);
}
