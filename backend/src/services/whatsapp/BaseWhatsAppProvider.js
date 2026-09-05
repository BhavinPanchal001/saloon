/**
 * Base Abstract WhatsApp Provider
 */
class BaseWhatsAppProvider {
  constructor(name, displayName) {
    if (new.target === BaseWhatsAppProvider) {
      throw new TypeError('Cannot construct BaseWhatsAppProvider instances directly.');
    }
    this.name = name;
    this.displayName = displayName;
  }

  /**
   * Return provider capabilities
   * @returns {{ sendText: boolean, sendImage: boolean, sendDocument: boolean }}
   */
  getCapabilities() {
    return {
      sendText: true,
      sendImage: true,
      sendDocument: true,
    };
  }

  /**
   * Return current connection and configuration status
   * @returns {{ status: 'connected' | 'disconnected' | 'connecting' | 'auth_required' | 'configured' | 'error', details?: any, phoneNumber?: string }}
   */
  async getStatus() {
    throw new Error('getStatus() must be implemented by subclass.');
  }

  /**
   * Send text message to recipient
   * @param {{ to: string, text: string }} params
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async sendMessage({ to, text }) {
    throw new Error('sendMessage() must be implemented by subclass.');
  }

  /**
   * Send full invoice (text receipt and/or PDF document) to customer
   * @param {Object} bill
   * @param {Object} [options]
   * @returns {Promise<{ success: boolean, recipient?: string, messageId?: string, error?: string, simulated?: boolean }>}
   */
  async sendInvoice(bill, options = {}) {
    throw new Error('sendInvoice() must be implemented by subclass.');
  }

  /**
   * Send document attachment (PDF, etc.) to recipient
   * @param {{ to: string, document: Buffer, fileName: string, caption?: string, mimetype?: string }} params
   * @returns {Promise<{ success: boolean, recipient?: string, messageId?: string, error?: string }>}
   */
  async sendDocument({ to, document, fileName, caption = '', mimetype = 'application/pdf' }) {
    throw new Error('sendDocument() must be implemented by subclass.');
  }

  /**
   * Format phone number to international E.164 without leading '+' or special chars
   * @param {string} phone
   * @param {string} defaultCountryCode
   * @returns {string|null}
   */
  formatPhoneNumber(phone, defaultCountryCode = '91') {
    if (!phone) return null;
    let cleaned = String(phone).replace(/\D/g, '');
    if (!cleaned) return null;

    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }

    if (cleaned.length === 10) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Format currency amount for display
   */
  formatAmount(num, currency = 'RM') {
    const n = Number(num) || 0;
    const cur = (currency && String(currency).trim()) ? String(currency).trim() : 'RM';
    return `${cur} ${n.toFixed(2)}`;
  }

  /**
   * Generate formatted text receipt content for WhatsApp message
   * Shared format across both Meta WhatsApp API and Baileys
   */
  buildBillReceiptText(bill) {
    const outletName = bill.outletName || bill.Outlet?.name || 'Glowy Saloon';
    const billNumber = bill.billNumber || bill.bill_number || 'N/A';
    const customerName = bill.customer?.name || bill.customer_name || 'Valued Customer';
    const dateStr = bill.createdAt ? new Date(bill.createdAt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }) : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    const curSymbol = bill.currency || 'RM';
    const fmt = (num) => this.formatAmount(num, curSymbol);

    const lineItems = bill.lineItems || bill.line_items || [];
    const talents = [
      ...new Set(
        [
          bill.servedBy,
          bill.served_by,
          bill.staffName,
          ...lineItems.map((it) => it.staffAssigned || it.staff_assigned),
        ].filter(Boolean)
      ),
    ];
    const servedBy = talents.join(', ');

    let itemsText = '';
    if (lineItems.length > 0) {
      itemsText = lineItems.map((item, index) => {
        const name = item.itemName || item.item_name || 'Item';
        const qty = item.qty || 1;
        const price = Number(item.price) || 0;
        const totalItemPrice = price * qty;
        const talent = item.staffAssigned || item.staff_assigned;
        const talentLine = talent ? `\n   _Served by: ${talent}_` : '';
        return `${index + 1}. *${name}* x${qty} - ${fmt(totalItemPrice)}${talentLine}`;
      }).join('\n');
    } else {
      itemsText = '_No items listed_';
    }

    const subtotal = Number(bill.subtotal) || 0;
    const discountAmount = Number(bill.discountAmount || bill.discount_amount) || 0;
    const voucherDiscount = Number(bill.voucherDiscountAmount || bill.voucher_discount_amount || bill.voucherDiscount || 0);
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

    const awardedCode = bill.awardedVoucherCode || bill.awarded_voucher_code || bill.awardedVoucher?.code;
    const awardedAmt = Number(bill.awardedVoucherAmount || bill.awarded_voucher_amount || bill.awardedVoucher?.amount || 0);

    let voucherRewardSection = '';
    if (awardedCode && awardedAmt > 0) {
      voucherRewardSection = `\n\n🎉 *SPECIAL GIFT FOR YOUR NEXT VISIT!* 🎁\nYou have received a reward voucher of *${fmt(awardedAmt)} OFF*!\n🎫 *Voucher Code:* *${awardedCode}*\n_Present this code during your next appointment to redeem!_`;
    }

    const message = `🧾 *INVOICE RECEIPT* - ${outletName}

Hello *${customerName}*, thank you for choosing ${outletName}! Here is your bill details:

📌 *Bill No:* ${billNumber}
📅 *Date:* ${dateStr}${servedBy ? `\n✂️ *Served by:* ${servedBy}` : ''}

🛍️ *SERVICES & PRODUCTS:*
${itemsText}

──────────────────
*Subtotal:* ${fmt(subtotal)}
${discountAmount > 0 ? `*Discount:* -${fmt(discountAmount)}\n` : ''}${voucherDiscount > 0 ? `*Voucher Discount:* -${fmt(voucherDiscount)}\n` : ''}*Tax:* ${fmt(tax)}
💳 *GRAND TOTAL:* *${fmt(grandTotal)}*
💳 *Payment Mode:* ${paymentMethod}${loyaltySection}${voucherRewardSection}

✨ Thank you for visiting us! We hope to see you again soon.
For any queries, please contact ${outletName}.`;

    return message;
  }
}

module.exports = BaseWhatsAppProvider;
