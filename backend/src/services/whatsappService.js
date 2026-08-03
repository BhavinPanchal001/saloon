const https = require('https');
const { URL } = require('url');
const { generateInvoicePDFBuffer } = require('./pdfService');

/**
 * Clean and format recipient phone number for Meta WhatsApp API.
 * Meta expects phone number in international E.164 format without leading '+' or special characters.
 * E.g., "+91 98765 43210" -> "919876543210"
 * "9876543210" (10 digits) with default country code 91 -> "919876543210"
 */
const formatPhoneNumber = (phone, defaultCountryCode = '91') => {
  if (!phone) return null;
  // Remove all non-digit characters
  let cleaned = String(phone).replace(/\D/g, '');
  
  if (!cleaned) return null;

  // If phone number starts with '0' and is 11 digits (e.g. 09876543210), strip leading zero
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // If phone number is 10 digits long, prepend default country code (e.g. India +91)
  if (cleaned.length === 10) {
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
};


/**
 * Format currency amount for display
 */
const formatAmount = (num, currency = 'RM') => {
  const n = Number(num) || 0;
  const cur = (currency && String(currency).trim()) ? String(currency).trim() : 'RM';
  return `${cur} ${n.toFixed(2)}`;
};

/**
 * Generate formatted text receipt content for WhatsApp message
 */
const buildBillReceiptText = (bill) => {
  const outletName = bill.outletName || bill.Outlet?.name || 'Glowy Saloon';
  const billNumber = bill.billNumber || bill.bill_number || 'N/A';
  const customerName = bill.customer?.name || bill.customer_name || 'Valued Customer';
  const dateStr = bill.createdAt ? new Date(bill.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }) : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const curSymbol = bill.currency || 'RM';
  const fmt = (num) => formatAmount(num, curSymbol);

  const lineItems = bill.lineItems || bill.line_items || [];

  let itemsText = '';
  if (lineItems.length > 0) {
    itemsText = lineItems.map((item, index) => {
      const name = item.itemName || item.item_name || 'Item';
      const qty = item.qty || 1;
      const price = Number(item.price) || 0;
      const totalItemPrice = price * qty;
      return `${index + 1}. *${name}* x${qty} - ${fmt(totalItemPrice)}`;
    }).join('\n');
  } else {
    itemsText = '_No items listed_';
  }

  const subtotal = Number(bill.subtotal) || 0;
  const discountAmount = Number(bill.discountAmount || bill.discount_amount) || 0;
  const tax = Number(bill.tax) || 0;
  const grandTotal = Number(bill.total) || 0;
  const paymentMethod = (bill.paymentMethod || bill.payment_method || 'CASH').toUpperCase();

  const pointsEarned = Number(bill.pointsEarned || bill.points_earned) || 0;
  const pointsRedeemed = Number(bill.pointsRedeemed || bill.points_redeemed) || 0;
  const pointsDiscountAmount = Number(bill.pointsDiscountAmount || bill.points_discount_amount) || 0;
  const totalPoints = bill.loyaltyPoints !== undefined ? bill.loyaltyPoints : bill.customer?.loyaltyPoints;

  let loyaltySection = '';
  if (pointsEarned > 0 || pointsRedeemed > 0 || totalPoints !== undefined) {
    loyaltySection = `\n\n🎁 *LOYALTY REWARDS:*\n` +
      (pointsRedeemed > 0 ? `• Points Redeemed: ${pointsRedeemed} (-${fmt(pointsDiscountAmount)})\n` : '') +
      (pointsEarned > 0 ? `• Points Earned Today: +${pointsEarned}\n` : '') +
      (totalPoints !== undefined ? `• Total Loyalty Balance: ${totalPoints} Pts\n` : '');
  }

  const message = `🧾 *INVOICE RECEIPT* - ${outletName}

Hello *${customerName}*, thank you for choosing ${outletName}! Here is your bill details:

📌 *Bill No:* ${billNumber}
📅 *Date:* ${dateStr}

🛍️ *SERVICES & PRODUCTS:*
${itemsText}

──────────────────
*Subtotal:* ${fmt(subtotal)}
${discountAmount > 0 ? `*Discount:* -${fmt(discountAmount)}\n` : ''}*Tax:* ${fmt(tax)}
💳 *GRAND TOTAL:* *${fmt(grandTotal)}*
💳 *Payment Mode:* ${paymentMethod}${loyaltySection}

✨ Thank you for visiting us! We hope to see you again soon.
For any queries, please contact ${outletName}.`;

  return message;
};


/**
 * Send WhatsApp message using Meta WhatsApp Business Cloud API via native HTTPS
 */
const sendMetaWhatsAppApiRequest = async ({ recipientPhone, messagePayload }) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Meta WhatsApp Business credentials missing in environment variables (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN).');
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
};

/**
 * Send Bill Receipt via Meta WhatsApp Cloud API
 * @param {Object} bill - Bill object with customer, line items, totals
 * @returns {Promise<Object>} Status object { success, recipient, messageId, error }
 */
const sendBillWhatsAppReceipt = async (bill) => {
  // Reload dotenv dynamically so any changes in .env are picked up immediately
  try {
    require('dotenv').config({ override: true });
  } catch (_) {}

  const isEnabled = process.env.WHATSAPP_ENABLED !== 'false';
  const defaultCountryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91';

  if (!isEnabled) {
    console.log('[WhatsApp] Service is disabled via WHATSAPP_ENABLED=false');
    return { success: false, reason: 'WhatsApp feature is disabled in settings.' };
  }

  const rawPhone = bill.customer?.phone || bill.customer_phone;
  const recipientPhone = formatPhoneNumber(rawPhone, defaultCountryCode);

  if (!recipientPhone) {
    console.warn(`[WhatsApp] Invalid or missing customer phone number for bill #${bill.billNumber || bill.bill_number}`);
    return { success: false, reason: 'Customer phone number is missing or invalid.' };
  }

  const messageText = buildBillReceiptText(bill);
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  let messagePayload;
  if (templateName) {
    // If a Meta approved template name is configured
    messagePayload = {
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: bill.customer?.name || bill.customer_name || 'Customer' },
              { type: 'text', text: bill.billNumber || bill.bill_number || 'N/A' },
              { type: 'text', text: formatAmount(bill.total) },
            ],
          },
        ],
      },
    };
  } else {
    // Standard text receipt message
    messagePayload = {
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };
  }

  // Check if credentials exist before sending
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.log(`[WhatsApp Simulation Mode] Credentials not set. Receipt message generated for ${recipientPhone}:\n${messageText}`);
    return {
      success: true,
      simulated: true,
      recipient: recipientPhone,
      message: 'WhatsApp message simulated (Meta credentials not provided in .env).',
      preview: messageText,
    };
  }

  try {
    const result = await sendMetaWhatsAppApiRequest({ recipientPhone, messagePayload });
    const messageId = result?.messages?.[0]?.id;
    console.log(`[WhatsApp] Text receipt sent successfully to ${recipientPhone}. Message ID: ${messageId}`);

    // Generate & send PDF Invoice document attachment
    try {
      const pdfBuffer = generateInvoicePDFBuffer(bill);
      const billNumClean = (bill.billNumber || bill.bill_number || 'bill').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pdfFilename = `Invoice_${billNumClean}.pdf`;

      console.log(`[WhatsApp] Uploading PDF document for bill #${bill.billNumber || bill.bill_number} to Meta Media...`);
      const mediaId = await uploadPdfMediaToMeta({
        pdfBuffer,
        filename: pdfFilename,
        phoneNumberId,
        accessToken,
      });

      const docPayload = {
        type: 'document',
        document: {
          id: mediaId,
          filename: pdfFilename,
          caption: `📄 PDF Invoice Receipt #${bill.billNumber || bill.bill_number}`,
        },
      };

      console.log(`[WhatsApp] Sending PDF document (Media ID: ${mediaId}) to ${recipientPhone}...`);
      await sendMetaWhatsAppApiRequest({ recipientPhone, messagePayload: docPayload });
    } catch (pdfErr) {
      console.warn('[WhatsApp] Non-blocking PDF sending notice:', pdfErr.message);
    }

    return {
      success: true,
      recipient: recipientPhone,
      messageId,
      result,
    };
  } catch (err) {
    console.error(`[WhatsApp Error] Failed to send message to ${recipientPhone}:`, err.message);
    return {
      success: false,
      recipient: recipientPhone,
      error: err.message,
    };
  }
};

module.exports = {
  formatPhoneNumber,
  buildBillReceiptText,
  sendBillWhatsAppReceipt,
};

