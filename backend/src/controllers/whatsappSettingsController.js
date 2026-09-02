const { whatsappService } = require('../services/whatsappService');
const { getWhatsAppConfig, updateWhatsAppConfig } = require('../services/whatsapp/config');

/**
 * Mask access token for safe frontend display
 */
const maskToken = (token) => {
  if (!token) return '';
  if (token.length <= 12) return '••••••••';
  return `${token.substring(0, 4)}••••••••${token.substring(token.length - 4)}`;
};

/**
 * GET /api/whatsapp/settings
 */
const getSettings = async (req, res) => {
  try {
    const config = getWhatsAppConfig();
    const status = await whatsappService.getStatus();

    const safeBusinessApi = {
      enabled: config.businessApi?.enabled !== false,
      phoneNumberId: config.businessApi?.phoneNumberId || '',
      businessAccountId: config.businessApi?.businessAccountId || '',
      templateName: config.businessApi?.templateName || '',
      defaultCountryCode: config.businessApi?.defaultCountryCode || '91',
      hasAccessToken: Boolean(config.businessApi?.accessToken),
      accessTokenMasked: maskToken(config.businessApi?.accessToken),
    };

    return res.json({
      success: true,
      provider: config.provider || 'business_api',
      businessApi: safeBusinessApi,
      baileys: config.baileys || {},
      status,
    });
  } catch (err) {
    console.error('[WhatsAppSettings] getSettings error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/whatsapp/settings
 */
const updateSettings = async (req, res) => {
  try {
    const { provider, businessApi, baileys } = req.body;
    const currentConfig = getWhatsAppConfig();
    const updates = {};

    // 1. Handle Business API config updates
    if (businessApi) {
      const nextAccessToken = (businessApi.accessToken && !businessApi.accessToken.includes('•••'))
        ? businessApi.accessToken.trim()
        : currentConfig.businessApi?.accessToken;

      updates.businessApi = {
        enabled: businessApi.enabled !== undefined ? Boolean(businessApi.enabled) : currentConfig.businessApi?.enabled,
        phoneNumberId: businessApi.phoneNumberId !== undefined ? businessApi.phoneNumberId.trim() : currentConfig.businessApi?.phoneNumberId,
        accessToken: nextAccessToken,
        businessAccountId: businessApi.businessAccountId !== undefined ? businessApi.businessAccountId.trim() : currentConfig.businessApi?.businessAccountId,
        templateName: businessApi.templateName !== undefined ? businessApi.templateName.trim() : currentConfig.businessApi?.templateName,
        defaultCountryCode: businessApi.defaultCountryCode !== undefined ? businessApi.defaultCountryCode.trim() : currentConfig.businessApi?.defaultCountryCode,
      };
    }

    // 2. Handle Baileys config updates
    if (baileys) {
      updates.baileys = {
        ...currentConfig.baileys,
        ...baileys,
      };
    }

    // Save config updates first
    if (Object.keys(updates).length > 0) {
      updateWhatsAppConfig(updates);
    }

    // 3. Handle Provider Switch
    if (provider && provider !== currentConfig.provider) {
      try {
        await whatsappService.setActiveProvider(provider);
      } catch (providerErr) {
        return res.status(400).json({
          success: false,
          message: providerErr.message,
        });
      }
    }

    const updatedStatus = await whatsappService.getStatus();

    return res.json({
      success: true,
      message: 'WhatsApp settings updated successfully.',
      provider: whatsappService.getActiveProviderName(),
      status: updatedStatus,
    });
  } catch (err) {
    console.error('[WhatsAppSettings] updateSettings error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/whatsapp/status
 */
const getStatus = async (req, res) => {
  try {
    const status = await whatsappService.getStatus();
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error('[WhatsAppSettings] getStatus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/whatsapp/baileys/connect
 * Starts Baileys connection / generates QR code
 */
const connectBaileys = async (req, res) => {
  try {
    const baileysProvider = whatsappService.getProvider('baileys');
    if (!baileysProvider) {
      return res.status(400).json({ success: false, message: 'Baileys provider not available' });
    }

    const result = await baileysProvider.connect();
    const status = await baileysProvider.getStatus();

    return res.json({
      success: true,
      message: 'Baileys connection initiated. Scan the QR code if prompted.',
      status,
      result,
    });
  } catch (err) {
    console.error('[WhatsAppSettings] connectBaileys error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/whatsapp/baileys/disconnect
 * Disconnects Baileys and resets local session
 */
const disconnectBaileys = async (req, res) => {
  try {
    const baileysProvider = whatsappService.getProvider('baileys');
    if (!baileysProvider) {
      return res.status(400).json({ success: false, message: 'Baileys provider not available' });
    }

    const result = await baileysProvider.disconnect();

    // If Baileys was currently the active provider, revert to business_api
    if (whatsappService.getActiveProviderName() === 'baileys') {
      await whatsappService.setActiveProvider('business_api').catch(() => {});
    }

    const status = await whatsappService.getStatus();

    return res.json({
      success: true,
      message: 'Baileys WhatsApp disconnected.',
      result,
      status,
    });
  } catch (err) {
    console.error('[WhatsAppSettings] disconnectBaileys error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/whatsapp/test-message
 * Send a test text message to verify connectivity
 */
const sendTestMessage = async (req, res) => {
  try {
    const { to, text, provider } = req.body;

    if (!to || !String(to).trim()) {
      return res.status(400).json({ success: false, message: 'Recipient phone number ("to") is required.' });
    }

    const messageText = (text && String(text).trim())
      ? String(text).trim()
      : 'Hello! This is a test message from Glowy Saloon POS system.';

    const result = await whatsappService.sendMessage({
      to: to.trim(),
      text: messageText,
      provider,
    });

    if (result.success) {
      return res.json({
        success: true,
        message: result.simulated
          ? 'Test message simulated (provider in simulation mode).'
          : 'Test message sent successfully!',
        result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to send test message.',
        result,
      });
    }
  } catch (err) {
    console.error('[WhatsAppSettings] sendTestMessage error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/whatsapp/logs
 */
const getLogs = (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = whatsappService.getMessageLogs(limit);
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getStatus,
  connectBaileys,
  disconnectBaileys,
  sendTestMessage,
  getLogs,
};
