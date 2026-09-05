const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '..', '..', 'whatsappConfig.json');

const getDefaultConfig = () => {
  try {
    require('dotenv').config({ override: true });
  } catch (_) {}

  return {
    provider: process.env.WHATSAPP_PROVIDER || 'business_api', // 'business_api' | 'baileys'
    ownerPhone: process.env.WHATSAPP_OWNER_PHONE || '',
    sendShiftReportToOwner: process.env.WHATSAPP_SEND_SHIFT_REPORT !== 'false',
    businessApi: {
      enabled: process.env.WHATSAPP_ENABLED !== 'false',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      templateName: process.env.WHATSAPP_TEMPLATE_NAME || '',
      defaultCountryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91',
    },
    baileys: {
      autoReconnect: true,
      defaultCountryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91',
    },
  };
};

let runtimeConfig = null;

const loadConfig = () => {
  const defaults = getDefaultConfig();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      runtimeConfig = {
        provider: parsed.provider || defaults.provider,
        ownerPhone: parsed.ownerPhone !== undefined ? parsed.ownerPhone : defaults.ownerPhone,
        sendShiftReportToOwner: parsed.sendShiftReportToOwner !== undefined ? Boolean(parsed.sendShiftReportToOwner) : defaults.sendShiftReportToOwner,
        businessApi: {
          ...defaults.businessApi,
          ...(parsed.businessApi || {}),
        },
        baileys: {
          ...defaults.baileys,
          ...(parsed.baileys || {}),
        },
      };
    } else {
      runtimeConfig = defaults;
      saveConfig(defaults);
    }
  } catch (err) {
    console.error('[WhatsAppConfig] Error reading whatsappConfig.json:', err.message);
    runtimeConfig = defaults;
  }
  return runtimeConfig;
};

const saveConfig = (data) => {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    runtimeConfig = { ...data };
    return true;
  } catch (err) {
    console.error('[WhatsAppConfig] Error saving whatsappConfig.json:', err.message);
    return false;
  }
};

const getWhatsAppConfig = () => {
  if (!runtimeConfig) {
    loadConfig();
  }
  return runtimeConfig;
};

const updateWhatsAppConfig = (updates) => {
  const current = getWhatsAppConfig();
  const nextConfig = {
    ...current,
    ...updates,
    ownerPhone: updates.ownerPhone !== undefined ? updates.ownerPhone : current.ownerPhone,
    sendShiftReportToOwner: updates.sendShiftReportToOwner !== undefined ? Boolean(updates.sendShiftReportToOwner) : current.sendShiftReportToOwner,
    businessApi: {
      ...current.businessApi,
      ...(updates.businessApi || {}),
    },
    baileys: {
      ...current.baileys,
      ...(updates.baileys || {}),
    },
  };

  const success = saveConfig(nextConfig);
  return { success, config: nextConfig };
};

module.exports = {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  loadConfig,
};
