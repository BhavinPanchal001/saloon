const WhatsAppBusinessProvider = require('./whatsapp/WhatsAppBusinessProvider');
const BaileysProvider = require('./whatsapp/BaileysProvider');
const { getWhatsAppConfig, updateWhatsAppConfig } = require('./whatsapp/config');
const { getLogs } = require('./whatsapp/messageLogger');

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
}

// Singleton instance
const whatsappService = new WhatsAppService();

// Export unified singleton instance and backward-compatible functions
module.exports = {
  whatsappService,
  sendBillWhatsAppReceipt: (bill, options) => whatsappService.sendInvoice(bill, options),
  formatPhoneNumber: (phone, code) => whatsappService.formatPhoneNumber(phone, code),
  buildBillReceiptText: (bill) => whatsappService.buildBillReceiptText(bill),
  getActiveProvider: () => whatsappService.getActiveProvider(),
  getStatus: () => whatsappService.getStatus(),
};
