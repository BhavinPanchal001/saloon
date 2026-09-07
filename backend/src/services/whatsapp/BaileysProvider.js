const path = require('path');
const fs = require('fs');
const BaseWhatsAppProvider = require('./BaseWhatsAppProvider');
const { generateInvoicePDFBuffer, generateThermalInvoicePDFBuffer } = require('../pdfService');
const { emitWhatsAppEvent } = require('../socketService');
const { logMessage } = require('./messageLogger');
const { getWhatsAppConfig } = require('./config');

const AUTH_DIR = path.join(__dirname, '..', '..', '..', 'baileys_auth_info');

class BaileysProvider extends BaseWhatsAppProvider {
  constructor() {
    super('baileys', 'Baileys / WhatsApp Web');
    this.sock = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'auth_required' | 'connected' | 'error'
    this.qrCode = null;
    this.qrDataUrl = null;
    this.connectedUser = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.saveCreds = null;
  }

  getCapabilities() {
    return {
      sendText: true,
      sendImage: true,
      sendDocument: true,
    };
  }

  hasSavedSession() {
    try {
      const credsPath = path.join(AUTH_DIR, 'creds.json');
      if (!fs.existsSync(credsPath)) return false;
      const data = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      return Boolean(data.registered && data.me && data.me.id);
    } catch (_) {
      return false;
    }
  }

  async getStatus() {
    return {
      provider: this.name,
      displayName: this.displayName,
      status: this.status,
      connected: this.status === 'connected',
      phoneNumber: this.connectedUser?.phone || null,
      userName: this.connectedUser?.name || null,
      qrDataUrl: this.qrDataUrl,
      pairingCode: this.pairingCode || null,
      hasSavedSession: this.hasSavedSession(),
      capabilities: this.getCapabilities(),
    };
  }

  emitStatus() {
    this.getStatus().then((status) => {
      emitWhatsAppEvent('whatsapp:status', status);
    }).catch(() => {});
  }

  /**
   * Initialize Baileys on startup if session exists
   */
  async init() {
    if (this.hasSavedSession()) {
      console.log('[Baileys] Found existing authenticated session. Reconnecting automatically...');
      await this.connect().catch((err) => {
        console.warn('[Baileys] Automatic reconnection note:', err.message);
      });
    } else {
      this.status = 'disconnected';
      this.emitStatus();
    }
  }

  /**
   * Connect to WhatsApp Web via Baileys socket
   */
  async connect(options = {}) {
    if (this.isConnecting || this.status === 'connected') {
      return { status: this.status, alreadyConnecting: true };
    }

    // Only clean auth files if explicitly requested (e.g. manual reset)
    if (options.forceClean) {
      this.cleanAuthFiles();
    }

    this.isConnecting = true;
    this.status = 'connecting';
    this.reconnectAttempts = 0;
    this.pairingCode = null;
    this.emitStatus();

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      // Cleanup any previous socket event listeners
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners();
        } catch (_) {}
        this.sock = null;
      }

      const baileysPkg = require('@whiskeysockets/baileys');
      const makeWASocket = baileysPkg.default || baileysPkg;
      const {
        useMultiFileAuthState,
        DisconnectReason,
        Browsers,
        fetchLatestWaWebVersion,
        fetchLatestBaileysVersion,
      } = baileysPkg;
      const pino = require('pino');
      const qrcode = require('qrcode');

      // Fetch latest WhatsApp Web version to avoid protocol version mismatch
      let waVersion;
      try {
        if (typeof fetchLatestWaWebVersion === 'function') {
          const waWeb = await fetchLatestWaWebVersion();
          if (waWeb && waWeb.version) waVersion = waWeb.version;
        }
      } catch (_) {
        try {
          if (typeof fetchLatestBaileysVersion === 'function') {
            const bVer = await fetchLatestBaileysVersion();
            if (bVer && bVer.version) waVersion = bVer.version;
          }
        } catch (__) {}
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      this.saveCreds = saveCreds;

      // Use standard Ubuntu Chrome identifier recommended for Baileys pairing & QR
      const browserInfo = Browsers?.ubuntu
        ? Browsers.ubuntu('Chrome')
        : ['Ubuntu', 'Chrome', '22.04.4'];

      this.sock = makeWASocket({
        ...(waVersion ? { version: waVersion } : {}),
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: browserInfo,
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          try {
            this.qrDataUrl = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
          } catch (qrErr) {
            console.error('[Baileys] QR code conversion error:', qrErr);
          }
          this.status = 'auth_required';
          emitWhatsAppEvent('whatsapp:qr', { qr: this.qrCode, qrDataUrl: this.qrDataUrl });
          this.emitStatus();
          console.log('[Baileys] New QR Code generated. Scan with WhatsApp Linked Devices.');
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.qrCode = null;
          this.qrDataUrl = null;
          this.pairingCode = null;
          this.reconnectAttempts = 0;
          this.isConnecting = false;

          let rawId = this.sock.user?.id || '';
          let phoneNumber = rawId.split(':')[0] || rawId.split('@')[0] || '';
          if (phoneNumber && !phoneNumber.startsWith('+')) {
            phoneNumber = `+${phoneNumber}`;
          }

          this.connectedUser = {
            id: rawId,
            name: this.sock.user?.name || 'Glowy Saloon Account',
            phone: phoneNumber,
          };

          console.log(`[Baileys] WhatsApp connected successfully! Number: ${phoneNumber}`);
          this.emitStatus();
        }

        if (connection === 'close') {
          this.isConnecting = false;
          const statusCode = lastDisconnect?.error?.output?.statusCode;

          // Code 515: Restart required during companion pairing handshake (crucial for QR & pairing code)
          if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
            console.log('[Baileys] WhatsApp pairing handshake: restart required (515). Reconnecting with preserved session...');
            setTimeout(() => {
              this.isConnecting = false;
              this.connect().catch(() => {});
            }, 500);
            return;
          }

          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
          console.log(`[Baileys] Connection closed. Status code: ${statusCode}. Logged out: ${isLoggedOut}`);

          if (isLoggedOut) {
            // User unlinked from WhatsApp
            this.cleanAuthFiles();
            this.status = 'disconnected';
            this.connectedUser = null;
            this.qrCode = null;
            this.qrDataUrl = null;
            this.pairingCode = null;
            this.sock = null;
            this.emitStatus();
            emitWhatsAppEvent('whatsapp:disconnected', { reason: 'Logged out from mobile device' });
          } else {
            // Network drop or temporary server disconnect
            this.status = 'disconnected';
            this.emitStatus();

            const config = getWhatsAppConfig();
            if (config?.baileys?.autoReconnect !== false && this.reconnectAttempts < 5) {
              this.reconnectAttempts += 1;
              const delay = Math.min(this.reconnectAttempts * 3000, 15000);
              console.log(`[Baileys] Reconnect attempt ${this.reconnectAttempts} in ${delay / 1000}s...`);
              setTimeout(() => {
                this.isConnecting = false;
                this.connect().catch(() => {});
              }, delay);
            }
          }
        }
      });

      return { success: true, status: this.status };
    } catch (err) {
      this.isConnecting = false;
      this.status = 'error';
      this.emitStatus();
      console.error('[Baileys] Error connecting:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Request pairing code for "Link with phone number" instead of QR code
   */
  async requestPairingCode(phoneNumber) {
    if (this.status === 'connected') {
      return { success: false, error: 'WhatsApp is already connected.' };
    }

    let cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
    const config = getWhatsAppConfig();
    const defaultCountryCode = config?.baileys?.defaultCountryCode || '91';

    // Auto prepend country code if 10 digits entered (common in India)
    if (cleanPhone.length === 10) {
      cleanPhone = `${defaultCountryCode}${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = `${defaultCountryCode}${cleanPhone.substring(1)}`;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid phone number with country code (e.g., 919876543210).' };
    }

    // Force a fresh socket for pairing code to ensure clean handshake
    this.isConnecting = false;
    await this.connect({ forceClean: true });
    // Allow brief tick for socket connection to initialize
    await new Promise((r) => setTimeout(r, 1500));

    if (!this.sock || typeof this.sock.requestPairingCode !== 'function') {
      return { success: false, error: 'Socket is still initializing. Please wait a moment and try again.' };
    }

    try {
      const code = await this.sock.requestPairingCode(cleanPhone);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
      this.pairingCode = formatted;
      emitWhatsAppEvent('whatsapp:pairing_code', { code: formatted });
      this.emitStatus();
      console.log(`[Baileys] Pairing code generated: ${formatted} for phone: ${cleanPhone}`);
      return { success: true, pairingCode: formatted, targetPhone: cleanPhone };
    } catch (err) {
      console.error('[Baileys] Failed to generate pairing code:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Disconnect and clear session
   */
  async disconnect() {
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch (_) {
          try {
            this.sock.end(new Error('Manual user disconnect'));
          } catch (__) {}
        }
      }
    } catch (_) {}

    this.sock = null;
    this.status = 'disconnected';
    this.qrCode = null;
    this.qrDataUrl = null;
    this.connectedUser = null;
    this.cleanAuthFiles();
    this.emitStatus();

    console.log('[Baileys] WhatsApp session disconnected and local credentials cleared.');
    return { success: true, message: 'Baileys WhatsApp disconnected.' };
  }

  cleanAuthFiles() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[Baileys] Error removing auth directory:', err.message);
    }
  }

  async sendMessage({ to, text }) {
    if (this.status !== 'connected' || !this.sock) {
      return {
        success: false,
        error: 'Baileys WhatsApp is not connected. Please connect WhatsApp in Settings.',
      };
    }

    const config = getWhatsAppConfig();
    const defaultCountryCode = config?.baileys?.defaultCountryCode || '91';
    const recipientPhone = this.formatPhoneNumber(to, defaultCountryCode);

    if (!recipientPhone) {
      return { success: false, error: 'Recipient phone number is missing or invalid.' };
    }

    const jid = `${recipientPhone}@s.whatsapp.net`;

    try {
      const result = await this.sock.sendMessage(jid, { text });
      const messageId = result?.key?.id;
      logMessage({
        recipientPhone,
        provider: this.name,
        type: 'test',
        status: 'sent',
        messageId,
      });
      return { success: true, recipient: recipientPhone, messageId };
    } catch (err) {
      console.error(`[Baileys Error] Failed to send message to ${recipientPhone}:`, err.message);
      logMessage({
        recipientPhone,
        provider: this.name,
        type: 'test',
        status: 'failed',
        error: err.message,
      });
      return { success: false, recipient: recipientPhone, error: err.message };
    }
  }

  async sendDocument({ to, document, fileName, caption = '', mimetype = 'application/pdf' }) {
    if (this.status !== 'connected' || !this.sock) {
      return {
        success: false,
        error: 'Baileys WhatsApp is not connected. Please connect WhatsApp in Settings.',
      };
    }

    const config = getWhatsAppConfig();
    const defaultCountryCode = config?.baileys?.defaultCountryCode || '91';
    const recipientPhone = this.formatPhoneNumber(to, defaultCountryCode);

    if (!recipientPhone) {
      return { success: false, error: 'Recipient phone number is missing or invalid.' };
    }

    const jid = `${recipientPhone}@s.whatsapp.net`;

    try {
      const result = await this.sock.sendMessage(jid, {
        document,
        mimetype,
        fileName: fileName || 'document.pdf',
        caption,
      });
      const messageId = result?.key?.id;
      logMessage({
        recipientPhone,
        provider: this.name,
        type: 'document',
        status: 'sent',
        messageId,
      });
      return { success: true, recipient: recipientPhone, messageId };
    } catch (err) {
      console.error(`[Baileys Error] Failed to send document to ${recipientPhone}:`, err.message);
      logMessage({
        recipientPhone,
        provider: this.name,
        type: 'document',
        status: 'failed',
        error: err.message,
      });
      return { success: false, recipient: recipientPhone, error: err.message };
    }
  }

  async sendInvoice(bill, options = {}) {
    if (this.status !== 'connected' || !this.sock) {
      return {
        success: false,
        provider: this.name,
        reason: 'Baileys WhatsApp is not connected. Please connect WhatsApp in Settings before sending invoices.',
      };
    }

    const config = getWhatsAppConfig();
    const defaultCountryCode = config?.baileys?.defaultCountryCode || '91';
    const rawPhone = bill.customer?.phone || bill.customer_phone;
    const recipientPhone = this.formatPhoneNumber(rawPhone, defaultCountryCode);
    const invoiceNum = bill.billNumber || bill.bill_number || 'N/A';
    const customerName = bill.customer?.name || bill.customer_name || 'Customer';

    if (!recipientPhone) {
      console.warn(`[Baileys] Invalid customer phone for bill #${invoiceNum}`);
      return { success: false, provider: this.name, reason: 'Customer phone number is missing or invalid.' };
    }

    const jid = `${recipientPhone}@s.whatsapp.net`;
    const messageText = this.buildBillReceiptText(bill);

    try {
      // 1. Send formatted text receipt
      const textMsg = await this.sock.sendMessage(jid, { text: messageText });
      const messageId = textMsg?.key?.id;
      console.log(`[Baileys] Text receipt sent for bill #${invoiceNum} to ${recipientPhone}. Message ID: ${messageId}`);

      // 2. Generate and send PDF Invoice attachment (Thermal vs A4)
      try {
        const isThermal = options.format === 'thermal' || (!options.format && options.templateMode !== 'a4');
        let pdfBuffer;
        let pdfFilename;
        let caption;
        const billNumClean = invoiceNum.replace(/[^a-zA-Z0-9_-]/g, '_');

        if (isThermal) {
          pdfBuffer = generateThermalInvoicePDFBuffer(bill, options);
          pdfFilename = `Receipt_${billNumClean}.pdf`;
          caption = `🧾 Thermal Receipt #${invoiceNum}`;
        } else {
          pdfBuffer = generateInvoicePDFBuffer(bill);
          pdfFilename = `Tax_Invoice_${billNumClean}.pdf`;
          caption = `📄 Tax Invoice #${invoiceNum}`;
        }

        await this.sock.sendMessage(jid, {
          document: pdfBuffer,
          mimetype: 'application/pdf',
          fileName: pdfFilename,
          caption,
        });
        console.log(`[Baileys] ${isThermal ? 'Thermal receipt' : 'A4 Tax Invoice'} PDF document sent for bill #${invoiceNum} to ${recipientPhone}.`);
      } catch (pdfErr) {
        console.warn('[Baileys] Non-blocking PDF sending note:', pdfErr.message);
      }

      logMessage({
        invoiceNumber: invoiceNum,
        customerName,
        recipientPhone,
        provider: this.name,
        type: 'invoice',
        status: 'sent',
        messageId,
      });

      return {
        success: true,
        provider: this.name,
        recipient: recipientPhone,
        messageId,
        format: (options.format === 'a4' || options.templateMode === 'a4') ? 'a4' : 'thermal',
      };
    } catch (err) {
      console.error(`[Baileys Error] Failed to send bill #${invoiceNum} to ${recipientPhone}:`, err.message);
      logMessage({
        invoiceNumber: invoiceNum,
        customerName,
        recipientPhone,
        provider: this.name,
        type: 'invoice',
        status: 'failed',
        error: err.message,
      });

      return {
        success: false,
        provider: this.name,
        recipient: recipientPhone,
        error: err.message,
      };
    }
  }
}

module.exports = BaileysProvider;
