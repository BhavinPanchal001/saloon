const WhatsAppBusinessProvider = require('./whatsapp/WhatsAppBusinessProvider');
const BaileysProvider = require('./whatsapp/BaileysProvider');
const { getWhatsAppConfig, updateWhatsAppConfig } = require('./whatsapp/config');
const { getLogs } = require('./whatsapp/messageLogger');
const { generateZReportPDFBuffer } = require('./pdfService');
const { getRuntimeBusinessInfo } = require('../controllers/businessSettingsController');

class WhatsAppService {
  constructor() {
    this.providers = {
      business_api: new WhatsAppBusinessProvider(),
      baileys: new BaileysProvider(),
    };

    // Debounce / duplicate prevention cache (billId -> timestamp)
    this.recentDispatches = new Map();
  }

  init() {
    // Attempt startup init for Baileys if saved session exists
    this.providers.baileys.init().catch((err) => {
      console.warn('[WhatsAppService] Baileys init warning:', err.message);
    });
  }

  getActiveProviderName() {
    const config = getWhatsAppConfig();
    return config?.provider || 'business_api';
  }

  getActiveProvider() {
    const activeName = this.getActiveProviderName();
    return this.providers[activeName] || this.providers.business_api;
  }

  getProvider(name) {
    return this.providers[name] || null;
  }

  async setActiveProvider(name) {
    if (!['business_api', 'baileys'].includes(name)) {
      throw new Error(`Invalid provider "${name}". Must be "business_api" or "baileys".`);
    }

    if (name === 'baileys') {
      const baileysStatus = await this.providers.baileys.getStatus();
      if (!baileysStatus.connected) {
        throw new Error('Baileys WhatsApp is not connected. Please connect WhatsApp before selecting this provider.');
      }
    }

    updateWhatsAppConfig({ provider: name });
    console.log(`[WhatsAppService] Switched active provider to: ${name}`);
    return { success: true, activeProvider: name };
  }

  async getStatus() {
    const activeProviderName = this.getActiveProviderName();
    const [businessApiStatus, baileysStatus] = await Promise.all([
      this.providers.business_api.getStatus(),
      this.providers.baileys.getStatus(),
    ]);

    return {
      activeProvider: activeProviderName,
      activeProviderDisplayName: this.providers[activeProviderName]?.displayName || 'Unknown',
      providers: {
        business_api: businessApiStatus,
        baileys: baileysStatus,
      },
    };
  }

  async sendMessage({ to, text, provider }) {
    const targetProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!targetProvider) {
      throw new Error(`WhatsApp provider "${provider}" not found.`);
    }
    return targetProvider.sendMessage({ to, text });
  }

  async sendInvoice(bill, options = {}) {
    const billId = bill.id || bill.billNumber || bill.bill_number;
    const now = Date.now();

    // Duplicate prevention: minimum 5s interval for the same bill to avoid accidental double clicks
    if (billId && this.recentDispatches.has(billId)) {
      const lastTime = this.recentDispatches.get(billId);
      if (now - lastTime < 5000) {
        console.warn(`[WhatsAppService] Duplicate dispatch blocked for bill ${billId} (within 5s).`);
        return {
          success: true,
          duplicateBlocked: true,
          message: 'WhatsApp invoice message is already being processed.',
        };
      }
    }

    if (billId) {
      this.recentDispatches.set(billId, now);
      // Clean up cache periodically
      if (this.recentDispatches.size > 200) {
        for (const [k, v] of this.recentDispatches.entries()) {
          if (now - v > 300000) this.recentDispatches.delete(k);
        }
      }
    }

    const provider = this.getActiveProvider();
    console.log(`[WhatsAppService] Sending invoice #${bill.billNumber || bill.bill_number} using active provider: ${provider.name} (${provider.displayName})`);
    return provider.sendInvoice(bill, options);
  }

  // Helper formatting delegates for backward compatibility
  formatPhoneNumber(phone, defaultCountryCode) {
    return this.getActiveProvider().formatPhoneNumber(phone, defaultCountryCode);
  }

  buildBillReceiptText(bill) {
    return this.getActiveProvider().buildBillReceiptText(bill);
  }

  getMessageLogs(limit) {
    return getLogs(limit);
  }

  async sendVoucherNotification({ voucher, customer }) {
    if (!customer?.phone) {
      return { success: false, reason: 'Customer phone number is missing.' };
    }

    const valueDisplay = voucher.voucher_type === 'percent'
      ? `${Number(voucher.initial_value)}% OFF`
      : `₹${Number(voucher.initial_value).toFixed(2)} OFF`;

    const minSpendText = Number(voucher.min_spend) > 0
      ? `\n📌 *Min Spend:* ₹${Number(voucher.min_spend).toFixed(2)}`
      : '';

    const expiryText = voucher.valid_until
      ? `\n⏳ *Valid Until:* ${voucher.valid_until}`
      : '\n⏳ *Validity:* No Expiry';

    const noteText = voucher.notes ? `\n💬 *Note:* ${voucher.notes}` : '';

    const messageText = `✨ *Glowy Salon - Exclusive Voucher for You!* ✨\n\n` +
      `Dear *${customer.name || 'Valued Customer'}*,\n` +
      `You've received an exclusive voucher from Glowy Salon! 🎁\n\n` +
      `🎟 *Voucher Code:* *${voucher.code}*\n` +
      `💰 *Value:* *${valueDisplay}*` +
      `${minSpendText}` +
      `${expiryText}` +
      `${noteText}\n\n` +
      `Show this voucher code at the counter to redeem your discount on your next visit.\n` +
      `We look forward to pampering you! 💇‍♀️💆‍♂️✨`;

    const activeProvider = this.getActiveProvider();
    console.log(`[WhatsAppService] Sending voucher ${voucher.code} to ${customer.phone} via ${activeProvider.name}`);
    return activeProvider.sendMessage({
      to: customer.phone,
      text: messageText,
    });
  }

  async sendDocument({ to, document, fileName, caption, mimetype, provider }) {
    const targetProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!targetProvider) {
      throw new Error(`WhatsApp provider "${provider}" not found.`);
    }
    return targetProvider.sendDocument({ to, document, fileName, caption, mimetype });
  }

  async sendZReportToOwner(reportData, options = {}) {
    const whatsappConfig = getWhatsAppConfig();
    const bizInfo = getRuntimeBusinessInfo();

    const rawPhone = (options.recipientPhone || whatsappConfig.ownerPhone || bizInfo.ownerPhone || bizInfo.phone || '').trim();
    if (!rawPhone) {
      console.warn('[WhatsAppService] Cannot send Z-Report: No owner WhatsApp phone number found in settings.');
      return {
        success: false,
        reason: 'No owner WhatsApp phone number configured in Settings.',
      };
    }

    const shift = reportData?.shift || {};
    const terminal = shift.terminal || {};
    const user = shift.user || {};
    const outlet = shift.outlet || {};

    const outletName = outlet.name || bizInfo.name || 'Glowy Saloon';
    const shiftId = shift.id || 'N/A';
    const terminalName = terminal.name || terminal.code || 'Counter 1';
    const cashierName = user.name || 'Staff';

    const openedStr = shift.opened_at ? new Date(shift.opened_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    const closedStr = shift.closed_at ? new Date(shift.closed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    const cur = bizInfo.currency || 'RM';
    const fmt = (num) => `${cur} ${(Number(num) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const billsCount = Number(reportData.billsCount) || 0;
    const grossSales = fmt(reportData.totalSales);
    const cashSales = fmt(reportData.cashSales);
    const cardSales = fmt(reportData.cardSales);
    const upiSales = fmt(reportData.upiSales);
    const otherSales = fmt((Number(reportData.creditSales) || 0) + (Number(reportData.otherSales) || 0));
    const totalDiscounts = fmt(reportData.totalDiscount);
    const totalTax = fmt(reportData.totalTax);

    const openingCash = fmt(reportData.openingCash);
    const totalCashIn = fmt(reportData.totalCashIn);
    const totalCashOut = fmt(reportData.totalCashOut);
    const expectedCash = fmt(reportData.expectedCash);
    const actualCash = fmt(shift.actual_closing_cash || 0);
    const varianceNum = Number(shift.variance) || 0;
    const varianceStatus = varianceNum === 0 ? 'Balanced' : varianceNum > 0 ? `Over (+${fmt(varianceNum)})` : `Short (-${fmt(Math.abs(varianceNum))})`;

    const messageText =
      `📊 *END OF SHIFT Z-REPORT* — ${outletName}\n\n` +
      `🏷️ *Shift #:* ${shiftId}  |  🖥️ *Terminal:* ${terminalName}\n` +
      `👤 *Cashier:* ${cashierName}\n` +
      `🕒 *Opened:* ${openedStr}\n` +
      `🏁 *Closed:* ${closedStr}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 *SALES SUMMARY:*\n` +
      `• *Total Bills:* ${billsCount}\n` +
      `• *Gross Sales:* *${grossSales}*\n` +
      `• Cash Sales: ${cashSales}\n` +
      `• Card Sales: ${cardSales}\n` +
      `• UPI / Online: ${upiSales}\n` +
      `• Credit/Other: ${otherSales}\n` +
      `• Total Discounts: ${totalDiscounts}\n` +
      `• Total Tax: ${totalTax}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *DRAWER RECONCILIATION:*\n` +
      `• Opening Float: ${openingCash}\n` +
      `• Cash Sales: +${cashSales}\n` +
      `• Cash In: +${totalCashIn}\n` +
      `• Cash Out: -${totalCashOut}\n` +
      `• *Expected Cash:* ${expectedCash}\n` +
      `• *Actual Cash Counted:* *${actualCash}*\n` +
      `• *Variance:* ${varianceStatus}\n` +
      (shift.closing_notes ? `\n📝 *Notes:* ${shift.closing_notes}\n` : '') +
      `\n📄 *Official Shift Z-Report PDF is attached below.*`;

    const activeProvider = this.getActiveProvider();
    const defaultCountryCode = whatsappConfig.businessApi?.defaultCountryCode || whatsappConfig.baileys?.defaultCountryCode || '91';
    const recipientPhone = this.formatPhoneNumber(rawPhone, defaultCountryCode);

    if (!recipientPhone) {
      return { success: false, reason: `Invalid owner phone number: "${rawPhone}"` };
    }

    console.log(`[WhatsAppService] Sending Z-Report for Shift #${shiftId} to owner (${recipientPhone}) via ${activeProvider.name}`);

    // 1. Send formatted text summary
    const textResult = await activeProvider.sendMessage({
      to: recipientPhone,
      text: messageText,
    });

    // 2. Generate PDF and send as document attachment
    let docResult = null;
    try {
      const pdfBuffer = generateZReportPDFBuffer(reportData);
      const fileName = `Z_Report_Shift_${shiftId}.pdf`;
      const caption = `📄 Shift #${shiftId} End of Shift Z-Report (${outletName})`;

      docResult = await activeProvider.sendDocument({
        to: recipientPhone,
        document: pdfBuffer,
        fileName,
        caption,
        mimetype: 'application/pdf',
      });
      console.log(`[WhatsAppService] Z-Report PDF document dispatched to ${recipientPhone}.`);
    } catch (pdfErr) {
      console.warn('[WhatsAppService] Non-blocking Z-Report PDF attachment warning:', pdfErr.message);
      docResult = { success: false, error: pdfErr.message };
    }

    return {
      success: textResult?.success || docResult?.success || false,
      recipient: recipientPhone,
      provider: activeProvider.name,
      textMessageId: textResult?.messageId,
      docMessageId: docResult?.messageId,
      error: textResult?.error || docResult?.error,
    };
  }

  async sendCustomerDueReminder({ customer, pendingBills = [], totalDue = 0, customMessage = '', upiId = '' }) {
    if (!customer?.phone) {
      return { success: false, reason: 'Customer phone number is missing.' };
    }

    const bizInfo = getRuntimeBusinessInfo();
    const salonName = bizInfo?.name || 'Glowy Saloon';
    const salonPhone = bizInfo?.phone || '';
    const currency = bizInfo?.currency || '₹';

    let messageText = customMessage;
    if (!messageText || !messageText.trim()) {
      let billsBreakdown = '';
      if (pendingBills && pendingBills.length > 0) {
        billsBreakdown = pendingBills
          .map((b) => {
            const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
            const billNum = b.billNumber || b.bill_number || b.id;
            const dueAmt = Number(b.remainingDue !== undefined ? b.remainingDue : b.total || 0).toFixed(2);
            return `• *Bill #${billNum}*${dateStr ? ` (${dateStr})` : ''}: ${currency}${dueAmt}`;
          })
          .join('\n');
      }

      const upiSection = upiId ? `\n📲 *Quick UPI Payment:*\n• UPI ID: *${upiId}*` : '';
      const phoneSection = salonPhone ? `\n📞 *Questions / Assistance:* ${salonPhone}` : '';

      messageText =
        `🔔 *PAYMENT REMINDER* — *${salonName}* ✨\n\n` +
        `Dear *${customer.name || 'Valued Customer'}*,\n\n` +
        `Greetings from *${salonName}*! We hope you enjoyed your visit.\n` +
        `This is a friendly reminder regarding your outstanding bill payment.\n\n` +
        (billsBreakdown ? `📋 *Pending Bills / Due Statement:*\n${billsBreakdown}\n━━━━━━━━━━━━━━━━━━━━\n` : '') +
        `💰 *Total Amount Due:* *${currency}${Number(totalDue).toFixed(2)}*\n` +
        `${upiSection}` +
        `\n💳 You may also settle your balance at the salon counter on your next visit.\n` +
        `${phoneSection}\n\n` +
        `If you have already cleared this payment, please disregard this reminder.\n` +
        `Thank you for choosing ${salonName}! 💆‍♀️💇‍♂️✨`;
    }

    const activeProvider = this.getActiveProvider();
    console.log(`[WhatsAppService] Sending customer due reminder to ${customer.phone} via ${activeProvider.name}`);
    const result = await activeProvider.sendMessage({
      to: customer.phone,
      text: messageText,
    });

    return {
      ...result,
      messageText,
    };
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

// Export unified singleton instance and backward-compatible functions
module.exports = {
  whatsappService,
  sendBillWhatsAppReceipt: (bill, options) => whatsappService.sendInvoice(bill, options),
  sendVoucherWhatsAppNotification: (payload) => whatsappService.sendVoucherNotification(payload),
  sendZReportToOwnerWhatsApp: (reportData, options) => whatsappService.sendZReportToOwner(reportData, options),
  sendCustomerDueReminderWhatsApp: (payload) => whatsappService.sendCustomerDueReminder(payload),
  formatPhoneNumber: (phone, code) => whatsappService.formatPhoneNumber(phone, code),
  buildBillReceiptText: (bill) => whatsappService.buildBillReceiptText(bill),
  getActiveProvider: () => whatsappService.getActiveProvider(),
  getStatus: () => whatsappService.getStatus(),
};

