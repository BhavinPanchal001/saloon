const path = require('path');
const fs = require('fs');
const BaseWhatsAppProvider = require('./BaseWhatsAppProvider');
const { generateInvoicePDFBuffer } = require('../pdfService');
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
      return fs.existsSync(credsPath);
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
      console.log('[Baileys] Found existing saved session. Reconnecting automatically...');
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
  async connect() {
    if (this.isConnecting || this.status === 'connected') {
      return { status: this.status, alreadyConnecting: true };
    }

    this.isConnecting = true;
    this.status = 'connecting';
    this.reconnectAttempts = 0;
    this.emitStatus();

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const baileysPkg = require('@whiskeysockets/baileys');
      const makeWASocket = baileysPkg.default || baileysPkg;
      const { useMultiFileAuthState, DisconnectReason, Browsers } = baileysPkg;
      const pino = require('pino');
      const qrcode = require('qrcode');

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      this.saveCreds = saveCreds;

      const browserInfo = Browsers && Browsers.appropriate
        ? Browsers.appropriate('Glowy POS')
        : ['Glowy POS', 'Chrome', '1.0.0'];

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: browserInfo,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
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
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[Baileys] Connection closed. Status code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

          if (!shouldReconnect) {
            // User logged out from WhatsApp
            this.cleanAuthFiles();
            this.status = 'disconnected';
            this.connectedUser = null;
            this.qrCode = null;
            this.qrDataUrl = null;
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

      // 2. Generate and send PDF Invoice attachment
      try {
        const pdfBuffer = generateInvoicePDFBuffer(bill);
        const billNumClean = invoiceNum.replace(/[^a-zA-Z0-9_-]/g, '_');
        const pdfFilename = `Invoice_${billNumClean}.pdf`;

        await this.sock.sendMessage(jid, {
          document: pdfBuffer,
          mimetype: 'application/pdf',
          fileName: pdfFilename,
          caption: `📄 PDF Invoice Receipt #${invoiceNum}`,
        });
        console.log(`[Baileys] PDF invoice document sent for bill #${invoiceNum} to ${recipientPhone}.`);
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
