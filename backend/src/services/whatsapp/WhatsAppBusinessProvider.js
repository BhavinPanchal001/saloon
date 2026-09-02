const https = require('https');
const { URL } = require('url');
const BaseWhatsAppProvider = require('./BaseWhatsAppProvider');
const { generateInvoicePDFBuffer } = require('../pdfService');
const { getWhatsAppConfig } = require('./config');
const { logMessage } = require('./messageLogger');

class WhatsAppBusinessProvider extends BaseWhatsAppProvider {
  constructor() {
    super('business_api', 'WhatsApp Business API');
  }

  getCapabilities() {
    return {
      sendText: true,
      sendImage: true,
      sendDocument: true,
    };
  }

  getCredentials() {
    const config = getWhatsAppConfig();
    const bApi = config?.businessApi || {};
    return {
      enabled: bApi.enabled !== false,
      phoneNumberId: bApi.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: bApi.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
      businessAccountId: bApi.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      templateName: bApi.templateName || process.env.WHATSAPP_TEMPLATE_NAME || '',
      defaultCountryCode: bApi.defaultCountryCode || process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91',
    };
  }

  async getStatus() {
    const creds = this.getCredentials();
    const isConfigured = Boolean(creds.phoneNumberId && creds.accessToken);
    return {
      provider: this.name,
      displayName: this.displayName,
      status: isConfigured ? (creds.enabled ? 'configured' : 'disabled') : 'disconnected',
      configured: isConfigured,
      enabled: creds.enabled,
      phoneNumberId: creds.phoneNumberId,
      businessAccountId: creds.businessAccountId,
      defaultCountryCode: creds.defaultCountryCode,
      templateName: creds.templateName,
      capabilities: this.getCapabilities(),
    };
  }

  async sendMetaWhatsAppApiRequest({ recipientPhone, messagePayload, creds }) {
    const { phoneNumberId, accessToken } = creds;

    if (!phoneNumberId || !accessToken) {
      throw new Error('Meta WhatsApp Business credentials missing (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN).');
    }

    const graphUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const postData = JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      ...messagePayload,
    });

    const parsedUrl = new URL(graphUrl);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              const apiErrorMsg = parsed?.error?.message || responseBody;
              reject(new Error(`Meta WhatsApp API HTTP ${res.statusCode}: ${apiErrorMsg}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response from Meta API: ${responseBody}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Upload PDF document to Meta WhatsApp Media Endpoint using multipart form-data
   */
  async uploadPdfMediaToMeta({ pdfBuffer, filename, creds }) {
    const { phoneNumberId, accessToken } = creds;
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    const postDataHeader = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="messaging_product"\r\n\r\n` +
      `whatsapp\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="type"\r\n\r\n` +
      `application/pdf\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
    );

    const postDataFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
    const payload = Buffer.concat([postDataHeader, pdfBuffer, postDataFooter]);

    const options = {
      hostname: 'graph.facebook.com',
      path: `/v20.0/${phoneNumberId}/media`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.id) {
              resolve(parsed.id);
            } else {
              reject(new Error(parsed?.error?.message || `Meta Media upload failed with status ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Meta media upload response: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  async sendMessage({ to, text }) {
    const creds = this.getCredentials();
    const recipientPhone = this.formatPhoneNumber(to, creds.defaultCountryCode);

    if (!recipientPhone) {
      return { success: false, error: 'Recipient phone number is invalid.' };
    }

    if (!creds.phoneNumberId || !creds.accessToken) {
      console.log(`[WhatsApp Business API Simulation] Message to ${recipientPhone}:\n${text}`);
      logMessage({
        recipientPhone,
        provider: this.name,
        type: 'test',
        status: 'simulated',
      });
      return {
        success: true,
        simulated: true,
        recipient: recipientPhone,
        message: 'Message simulated (Meta credentials not provided).',
      };
    }

    try {
      const result = await this.sendMetaWhatsAppApiRequest({
        recipientPhone,
        messagePayload: {
          type: 'text',
          text: { preview_url: false, body: text },
        },
        creds,
      });
      const messageId = result?.messages?.[0]?.id;
      logMessage({
        recipientPhone,
        provider: this.name,
        type: 'test',
        status: 'sent',
        messageId,
      });
      return { success: true, recipient: recipientPhone, messageId, result };
    } catch (err) {
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

  async sendInvoice(bill, options = {}) {
    const creds = this.getCredentials();

    if (!creds.enabled) {
      console.log('[WhatsApp Business API] Service is disabled.');
      return { success: false, reason: 'WhatsApp Business API is disabled in settings.' };
    }

    const rawPhone = bill.customer?.phone || bill.customer_phone;
    const recipientPhone = this.formatPhoneNumber(rawPhone, creds.defaultCountryCode);
    const invoiceNum = bill.billNumber || bill.bill_number || 'N/A';
    const customerName = bill.customer?.name || bill.customer_name || 'Customer';

    if (!recipientPhone) {
      console.warn(`[WhatsApp Business API] Invalid or missing customer phone for bill #${invoiceNum}`);
      return { success: false, reason: 'Customer phone number is missing or invalid.' };
    }

    const messageText = this.buildBillReceiptText(bill);
    const templateName = creds.templateName;

    let messagePayload;
    if (templateName) {
      messagePayload = {
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: invoiceNum },
                { type: 'text', text: this.formatAmount(bill.total, bill.currency) },
              ],
            },
          ],
        },
      };
    } else {
      messagePayload = {
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      };
    }

    // Simulation mode if credentials are unset
    if (!creds.phoneNumberId || !creds.accessToken) {
      console.log(`[WhatsApp Business API Simulation] Credentials not set. Receipt for #${invoiceNum} -> ${recipientPhone}:\n${messageText}`);
      logMessage({
        invoiceNumber: invoiceNum,
        customerName,
        recipientPhone,
        provider: this.name,
        type: 'invoice',
        status: 'simulated',
      });
      return {
        success: true,
        simulated: true,
        provider: this.name,
        recipient: recipientPhone,
        message: 'WhatsApp invoice message simulated (Meta Business API credentials not configured).',
        preview: messageText,
      };
    }

    try {
      const result = await this.sendMetaWhatsAppApiRequest({ recipientPhone, messagePayload, creds });
      const messageId = result?.messages?.[0]?.id;
      console.log(`[WhatsApp Business API] Receipt sent for bill #${invoiceNum} to ${recipientPhone}. Message ID: ${messageId}`);

      // Attempt to send PDF Invoice attachment if possible
      try {
        const pdfBuffer = generateInvoicePDFBuffer(bill);
        const billNumClean = invoiceNum.replace(/[^a-zA-Z0-9_-]/g, '_');
        const pdfFilename = `Invoice_${billNumClean}.pdf`;

        const mediaId = await this.uploadPdfMediaToMeta({
          pdfBuffer,
          filename: pdfFilename,
          creds,
        });

        const docPayload = {
          type: 'document',
          document: {
            id: mediaId,
            filename: pdfFilename,
            caption: `📄 PDF Invoice Receipt #${invoiceNum}`,
          },
        };

        await this.sendMetaWhatsAppApiRequest({ recipientPhone, messagePayload: docPayload, creds });
        console.log(`[WhatsApp Business API] PDF document attached for bill #${invoiceNum}.`);
      } catch (pdfErr) {
        console.warn('[WhatsApp Business API] Non-blocking PDF document upload note:', pdfErr.message);
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
        result,
      };
    } catch (err) {
      console.error(`[WhatsApp Business API Error] Failed to send bill #${invoiceNum} to ${recipientPhone}:`, err.message);
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

module.exports = WhatsAppBusinessProvider;
