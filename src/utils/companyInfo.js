/**
 * Company & Business Information Utility
 * Dynamically reads the real stored business configuration from localStorage
 * with automatic fallback defaults.
 */

const DEFAULT_COMPANY_INFO = {
  name: "Glowy",
  tagline: "Glow to go with Glowy",
  logoUrl: "",
  showLogoOnReceipt: true,
  address: "Kuala Lumpur, Malaysia",
  phone: "+60 12-345 6789",
  email: "hello@glowy.my",
  website: "www.glowy.my",
  gstin: "",
  taxNumber: "",
  currency: "RM",
  receiptHeader: "Welcome to Glowy",
  receiptFooter: "Thank you for visiting! Glow to go with Glowy ✨",
  terms: "Services and products once rendered/sold are non-refundable. Computer generated invoice.",
};

/**
 * Resolves a full, usable image URL from relative upload paths, full URLs, or base64 data URIs
 */
export const getFullImageUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const backendBase = apiBase.replace(/\/api\/?$/, "");
  return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const getCompanyInfo = () => {
  try {
    const raw = localStorage.getItem("glowy_business_info");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_COMPANY_INFO,
        ...parsed,
        gstin: parsed.taxNumber || parsed.gstin || "",
      };
    }
  } catch (err) {
    console.warn("Could not parse saved business info:", err);
  }
  return { ...DEFAULT_COMPANY_INFO };
};

/**
 * Live Proxy object ensuring existing imports (e.g. COMPANY_INFO.address)
 * always evaluate dynamically to the latest saved business settings.
 */
export const COMPANY_INFO = new Proxy(DEFAULT_COMPANY_INFO, {
  get(target, prop) {
    const current = getCompanyInfo();
    if (prop === "gstin") {
      return current.taxNumber || current.gstin || "";
    }
    return current[prop] !== undefined ? current[prop] : target[prop];
  },
});
