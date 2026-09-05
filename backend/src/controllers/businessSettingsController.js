const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'businessConfig.json');

const DEFAULT_BUSINESS_INFO = {
  name: "Glowy",
  tagline: "Glow to go with Glowy",
  logoUrl: "",
  showLogoOnReceipt: true,
  address: "Kuala Lumpur, Malaysia",
  phone: "+60 12-345 6789",
  ownerPhone: "",
  email: "hello@glowy.my",
  website: "www.glowy.my",
  taxNumber: "",
  currency: "RM",
  receiptHeader: "Welcome to Glowy",
  receiptFooter: "Thank you for visiting! Glow to go with Glowy ✨",
  terms: "Services and products once rendered/sold are non-refundable. Computer generated invoice.",
};

let runtimeConfig = { ...DEFAULT_BUSINESS_INFO };

// Load persisted configuration from JSON file on module init
const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      runtimeConfig = { ...DEFAULT_BUSINESS_INFO, ...parsed };
    } else {
      saveConfig(DEFAULT_BUSINESS_INFO);
    }
  } catch (err) {
    console.error('[BusinessSettings] Error reading businessConfig.json:', err.message);
    runtimeConfig = { ...DEFAULT_BUSINESS_INFO };
  }
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
    console.error('[BusinessSettings] Error saving businessConfig.json:', err.message);
    return false;
  }
};

loadConfig();

/**
 * GET /api/v1/business-settings
 */
const getBusinessSettings = (req, res) => {
  loadConfig();
  return res.json({
    success: true,
    data: runtimeConfig,
  });
};

/**
 * PUT /api/v1/business-settings
 */
const updateBusinessSettings = (req, res) => {
  try {
    const updates = req.body || {};
    const updated = {
      name: (updates.name || runtimeConfig.name || "").trim(),
      tagline: (updates.tagline || "").trim(),
      logoUrl: updates.logoUrl !== undefined ? updates.logoUrl : (runtimeConfig.logoUrl || ""),
      showLogoOnReceipt: updates.showLogoOnReceipt !== undefined ? Boolean(updates.showLogoOnReceipt) : (runtimeConfig.showLogoOnReceipt ?? true),
      address: (updates.address || "").trim(),
      phone: (updates.phone || "").trim(),
      ownerPhone: updates.ownerPhone !== undefined ? (updates.ownerPhone || "").trim() : (runtimeConfig.ownerPhone || "").trim(),
      email: (updates.email || "").trim(),
      website: (updates.website || "").trim(),
      taxNumber: (updates.taxNumber || updates.tax_number || updates.gstin || "").trim(),
      currency: (updates.currency || "RM").trim(),
      receiptHeader: (updates.receiptHeader || "").trim(),
      receiptFooter: (updates.receiptFooter || "").trim(),
      terms: (updates.terms || "").trim(),
    };

    const saved = saveConfig(updated);
    if (!saved) {
      return res.status(500).json({ success: false, message: "Failed to save business settings to disk" });
    }

    return res.json({
      success: true,
      message: "Business information updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error('[BusinessSettings] update error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/business-settings/logo
 * Handle logo image file upload
 */
const uploadBusinessLogo = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    const relativeUrl = `/uploads/business/${req.file.filename}`;
    runtimeConfig.logoUrl = relativeUrl;
    saveConfig(runtimeConfig);

    return res.json({
      success: true,
      message: "Salon logo uploaded successfully",
      data: {
        logoUrl: relativeUrl,
        filename: req.file.filename,
      },
    });
  } catch (err) {
    console.error('[BusinessSettings] upload logo error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Helper for backend services (PDF, Thermal Printer)
 */
const getRuntimeBusinessInfo = () => {
  return { ...runtimeConfig };
};

module.exports = {
  getBusinessSettings,
  updateBusinessSettings,
  uploadBusinessLogo,
  getRuntimeBusinessInfo,
};
