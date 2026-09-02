import { useState, useEffect } from "react";
import {
  fetchWhatsAppSettingsAPI,
  saveWhatsAppSettingsAPI,
  fetchWhatsAppStatusAPI,
  connectBaileysAPI,
  disconnectBaileysAPI,
  sendWhatsAppTestMessageAPI,
  fetchWhatsAppLogsAPI,
} from "../../services/api";
import { subscribeToWhatsAppEvents } from "../../services/socket";
import { useToastStore } from "../../stores/toastStore";
import {
  MessageCircle,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Send,
  Save,
  ShieldCheck,
  Smartphone,
  Info,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  Check,
  X,
} from "lucide-react";

export function WhatsAppSettingsTab() {
  const toast = useToastStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeProvider, setActiveProvider] = useState("business_api");

  // Business API form
  const [businessApiForm, setBusinessApiForm] = useState({
    enabled: true,
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    templateName: "",
    defaultCountryCode: "91",
    hasAccessToken: false,
    accessTokenMasked: "",
  });
  const [showAccessToken, setShowAccessToken] = useState(false);

  // Baileys state
  const [baileysStatus, setBaileysStatus] = useState({
    status: "disconnected", // 'disconnected' | 'connecting' | 'auth_required' | 'connected' | 'error'
    connected: false,
    phoneNumber: null,
    userName: null,
    qrDataUrl: null,
  });
  const [connectingBaileys, setConnectingBaileys] = useState(false);
  const [disconnectingBaileys, setDisconnectingBaileys] = useState(false);

  // Test message form
  const [testPhone, setTestPhone] = useState("");
  const [testText, setTestText] = useState("Hello from Glowy Saloon POS! This is a test WhatsApp message.");
  const [sendingTest, setSendingTest] = useState(false);

  // Message Logs
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchWhatsAppSettingsAPI();
      setActiveProvider(data.provider || "business_api");

      if (data.businessApi) {
        setBusinessApiForm({
          enabled: data.businessApi.enabled !== false,
          phoneNumberId: data.businessApi.phoneNumberId || "",
          businessAccountId: data.businessApi.businessAccountId || "",
          accessToken: "", // keep blank on client unless typing new token
          templateName: data.businessApi.templateName || "",
          defaultCountryCode: data.businessApi.defaultCountryCode || "91",
          hasAccessToken: Boolean(data.businessApi.hasAccessToken),
          accessTokenMasked: data.businessApi.accessTokenMasked || "",
        });
      }

      if (data.status?.providers?.baileys) {
        setBaileysStatus(data.status.providers.baileys);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp settings:", err);
      toast.error(err.message || "Failed to load WhatsApp settings");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetchWhatsAppLogsAPI(20);
      setLogs(res.logs || []);
    } catch (_) {
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadData();
    loadLogs();

    // Subscribe to real-time Baileys QR & status updates over Socket.IO
    const unsubscribe = subscribeToWhatsAppEvents({
      onStatus: (statusData) => {
        if (statusData?.providers?.baileys) {
          setBaileysStatus(statusData.providers.baileys);
        } else if (statusData?.provider === "baileys") {
          setBaileysStatus(statusData);
        }
        if (statusData?.activeProvider) {
          setActiveProvider(statusData.activeProvider);
        }
      },
      onQR: (qrData) => {
        setBaileysStatus((prev) => ({
          ...prev,
          status: "auth_required",
          connected: false,
          qrDataUrl: qrData.qrDataUrl,
        }));
      },
      onDisconnected: () => {
        setBaileysStatus((prev) => ({
          ...prev,
          status: "disconnected",
          connected: false,
          phoneNumber: null,
          qrDataUrl: null,
        }));
        toast.info("WhatsApp Web session disconnected.");
      },
    });

    return () => unsubscribe();
  }, []);

  // Polling fallback while connecting or waiting for QR scan
  useEffect(() => {
    let interval = null;
    if (!baileysStatus.connected && (baileysStatus.status === "connecting" || baileysStatus.status === "auth_required")) {
      interval = setInterval(async () => {
        try {
          const res = await fetchWhatsAppStatusAPI();
          if (res?.providers?.baileys) {
            setBaileysStatus(res.providers.baileys);
          }
          if (res?.activeProvider) {
            setActiveProvider(res.activeProvider);
          }
        } catch (_) {}
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [baileysStatus.connected, baileysStatus.status]);

  const handleProviderSelect = async (providerKey) => {
    if (providerKey === "baileys" && !baileysStatus.connected) {
      toast.error("Baileys WhatsApp is not connected. Please connect WhatsApp below before selecting this provider.");
      return;
    }

    try {
      const res = await saveWhatsAppSettingsAPI({ provider: providerKey });
      setActiveProvider(providerKey);
      toast.success(res.message || `Switched active provider to ${providerKey === "baileys" ? "Baileys" : "Business API"}`);
    } catch (err) {
      toast.error(err.message || "Failed to switch WhatsApp provider");
    }
  };

  const handleSaveBusinessApi = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        provider: activeProvider,
        businessApi: {
          enabled: businessApiForm.enabled,
          phoneNumberId: businessApiForm.phoneNumberId,
          businessAccountId: businessApiForm.businessAccountId,
          accessToken: businessApiForm.accessToken || undefined,
          templateName: businessApiForm.templateName,
          defaultCountryCode: businessApiForm.defaultCountryCode,
        },
      };

      const res = await saveWhatsAppSettingsAPI(payload);
      toast.success("WhatsApp Business API settings saved successfully!");
      setBusinessApiForm((prev) => ({
        ...prev,
        hasAccessToken: Boolean(businessApiForm.accessToken) || prev.hasAccessToken,
        accessToken: "", // clear typed password
      }));
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectBaileys = async () => {
    setConnectingBaileys(true);
    try {
      const res = await connectBaileysAPI();
      if (res.status) {
        setBaileysStatus(res.status);
      }
      toast.info(res.message || "Connection started. Generating QR Code...");
    } catch (err) {
      toast.error(err.message || "Failed to initiate Baileys connection");
    } finally {
      setConnectingBaileys(false);
    }
  };

  const handleDisconnectBaileys = async () => {
    if (!window.confirm("Are you sure you want to disconnect this WhatsApp account? You will need to scan the QR code again to reconnect.")) {
      return;
    }

    setDisconnectingBaileys(true);
    try {
      const res = await disconnectBaileysAPI();
      if (res.status?.providers?.baileys) {
        setBaileysStatus(res.status.providers.baileys);
      } else {
        setBaileysStatus({
          status: "disconnected",
          connected: false,
          phoneNumber: null,
          userName: null,
          qrDataUrl: null,
        });
      }
      if (res.status?.activeProvider) {
        setActiveProvider(res.status.activeProvider);
      }
      toast.success(res.message || "Baileys WhatsApp disconnected.");
      loadLogs();
    } catch (err) {
      toast.error(err.message || "Failed to disconnect Baileys");
    } finally {
      setDisconnectingBaileys(false);
    }
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("Please enter a recipient phone number");
      return;
    }

    setSendingTest(true);
    try {
      const res = await sendWhatsAppTestMessageAPI({
        to: testPhone.trim(),
        text: testText.trim(),
        provider: activeProvider,
      });

      if (res.success) {
        toast.success(res.message || "Test message sent successfully!");
        loadLogs();
      } else {
        toast.error(res.message || "Failed to send test message");
      }
    } catch (err) {
      toast.error(err.message || "Failed to send test message");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-navy-900">WhatsApp Messaging Settings</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choose your WhatsApp provider and configure message sending for POS invoices and customer receipts.
        </p>
      </div>

      {/* ─── Active Provider Selector Cards ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-navy-500">
            Select Active Messaging Provider
          </p>
          <span className="text-xs text-slate-400">
            Active: <strong className="text-navy-900">{activeProvider === "baileys" ? "Baileys / WhatsApp Web" : "WhatsApp Business API"}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider 1: WhatsApp Business API */}
          <div
            onClick={() => handleProviderSelect("business_api")}
            className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${
              activeProvider === "business_api"
                ? "border-navy-600 bg-navy-50/50 shadow-md ring-2 ring-navy-200/50"
                : "border-slate-200 bg-white/70 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-navy-900 text-base">WhatsApp Business API</h4>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      Official Meta Cloud
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Enterprise Cloud API by Meta</p>
                </div>
              </div>

              <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                activeProvider === "business_api" ? "border-navy-600 bg-navy-600 text-white" : "border-slate-300"
              }`}>
                {activeProvider === "business_api" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
              Official WhatsApp Cloud API hosted by Meta. Highly reliable with formal template support. Subject to Meta per-message conversation pricing.
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Configured & Ready
              </span>
              <span className="text-slate-400 font-mono text-[11px]">Meta Graph API v20.0</span>
            </div>
          </div>

          {/* Provider 2: Baileys / WhatsApp Web */}
          <div
            onClick={() => handleProviderSelect("baileys")}
            className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${
              activeProvider === "baileys"
                ? "border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-200/50"
                : "border-slate-200 bg-white/70 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-navy-900 text-base">Baileys / WhatsApp Web</h4>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Free / Self-Hosted
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Direct WhatsApp Web Connection</p>
                </div>
              </div>

              <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                activeProvider === "baileys" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
              }`}>
                {activeProvider === "baileys" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
              Connect your WhatsApp account directly via WhatsApp Web. Free from per-message API charges. Unofficial integration subject to WhatsApp Web connection rules.
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg border ${
                baileysStatus.connected
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200/60"
                  : baileysStatus.status === "auth_required"
                  ? "text-amber-700 bg-amber-50 border-amber-200/60"
                  : "text-slate-600 bg-slate-100 border-slate-200"
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  baileysStatus.connected
                    ? "bg-emerald-500 animate-pulse"
                    : baileysStatus.status === "auth_required"
                    ? "bg-amber-500 animate-ping"
                    : "bg-rose-500"
                }`} />
                {baileysStatus.connected
                  ? `Connected (${baileysStatus.phoneNumber || "Linked"})`
                  : baileysStatus.status === "auth_required"
                  ? "Scan QR Code Required"
                  : "Not Connected"}
              </span>
              <span className="text-slate-400 text-[11px]">Direct WebSockets</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Baileys WhatsApp Connection Manager ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-navy-900 text-base">Baileys WhatsApp Web Connection</h4>
              <p className="text-xs text-slate-500">Pair your salon WhatsApp number by scanning the QR code</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {baileysStatus.connected ? (
              <button
                type="button"
                onClick={handleDisconnectBaileys}
                disabled={disconnectingBaileys}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <Power className="h-3.5 w-3.5" />
                {disconnectingBaileys ? "Disconnecting..." : "Disconnect WhatsApp"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectBaileys}
                disabled={connectingBaileys || baileysStatus.status === "connecting"}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {connectingBaileys || baileysStatus.status === "connecting" ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" />
                    Connect WhatsApp
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Status Content */}
        {baileysStatus.connected ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-emerald-950 text-sm">WhatsApp Account Connected</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Ready to send receipts from phone number: <strong>{baileysStatus.phoneNumber || "Connected Account"}</strong>
                </p>
              </div>
            </div>
            <div className="text-right sm:text-right">
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Session Active &amp; Persisted
              </span>
            </div>
          </div>
        ) : baileysStatus.status === "auth_required" && baileysStatus.qrDataUrl ? (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-md border border-amber-200/80">
              <img
                src={baileysStatus.qrDataUrl}
                alt="Baileys WhatsApp QR Code"
                className="h-60 w-60 rounded-xl"
              />
              <p className="text-[11px] text-slate-400 mt-2 font-medium">QR code refreshes automatically</p>
            </div>

            <div className="space-y-3 flex-1 text-slate-700">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                <Clock className="h-3.5 w-3.5" /> Authentication Required
              </div>
              <h5 className="font-bold text-navy-900 text-base">Scan this QR Code from WhatsApp</h5>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 pl-1 leading-relaxed">
                <li>Open <strong>WhatsApp</strong> on your salon phone.</li>
                <li>Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings (⚙️)</strong> on iPhone.</li>
                <li>Select <strong>Linked Devices</strong>.</li>
                <li>Tap <strong>Link a Device</strong> and point your camera at this QR code.</li>
              </ol>
              <p className="text-xs text-amber-700 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
                Once scanned, your session is saved securely on the server and will persist across restarts.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <p className="font-bold text-navy-900 text-sm">Baileys is currently Not Connected</p>
              </div>
              <p className="text-xs text-slate-500">
                Click <strong>"Connect WhatsApp"</strong> to generate a pairing QR code and link your salon WhatsApp account.
              </p>
            </div>
            <button
              type="button"
              onClick={handleConnectBaileys}
              disabled={connectingBaileys}
              className="btn-premium-primary text-xs !py-2 !px-4 flex items-center gap-1.5 justify-center"
            >
              <QrCode className="h-4 w-4" />
              Start Connection
            </button>
          </div>
        )}
      </div>

      {/* ─── WhatsApp Business API Settings Form ─── */}
      <form onSubmit={handleSaveBusinessApi} className="rounded-2xl border border-slate-200 bg-white/70 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-navy-900 text-base">Meta WhatsApp Business API Credentials</h4>
              <p className="text-xs text-slate-500">Configure Meta Cloud API credentials from your Meta Developers portal</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={businessApiForm.enabled}
              onChange={(e) => setBusinessApiForm({ ...businessApiForm, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-900"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone Number ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={businessApiForm.phoneNumberId}
              onChange={(e) => setBusinessApiForm({ ...businessApiForm, phoneNumberId: e.target.value })}
              placeholder="e.g. 1264630640063742"
              className="premium-input font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">Meta assigned Phone Number ID from WhatsApp App Dashboard</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              WhatsApp Business Account ID (WABA ID)
            </label>
            <input
              type="text"
              value={businessApiForm.businessAccountId}
              onChange={(e) => setBusinessApiForm({ ...businessApiForm, businessAccountId: e.target.value })}
              placeholder="e.g. 971088616011035"
              className="premium-input font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">Account ID found in Meta Business Manager</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Permanent Access Token <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showAccessToken ? "text" : "password"}
                value={businessApiForm.accessToken}
                onChange={(e) => setBusinessApiForm({ ...businessApiForm, accessToken: e.target.value })}
                placeholder={businessApiForm.hasAccessToken ? `Token Saved (${businessApiForm.accessTokenMasked})` : "Paste Meta System User Access Token"}
                className="premium-input font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {businessApiForm.hasAccessToken
                ? "A valid token is securely saved. Leave blank to keep existing token."
                : "System User Token with whatsapp_business_messaging permission."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Country Code (E.164)
            </label>
            <input
              type="text"
              value={businessApiForm.defaultCountryCode}
              onChange={(e) => setBusinessApiForm({ ...businessApiForm, defaultCountryCode: e.target.value })}
              placeholder="91"
              className="premium-input font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">Prepended to 10-digit customer mobile numbers (e.g. 91 for India, 60 for Malaysia)</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Approved Template Name (Optional)
            </label>
            <input
              type="text"
              value={businessApiForm.templateName}
              onChange={(e) => setBusinessApiForm({ ...businessApiForm, templateName: e.target.value })}
              placeholder="e.g. invoice_receipt_v1"
              className="premium-input font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Leave blank to send standard WhatsApp formatted text receipts. If specified, Meta template message will be used.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-premium-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Credentials..." : "Save Business API Settings"}
          </button>
        </div>
      </form>

      {/* ─── Test Message Sender Card ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-navy-900 text-base">Send Test WhatsApp Message</h4>
            <p className="text-xs text-slate-500">
              Verify that the active provider ({activeProvider === "baileys" ? "Baileys" : "WhatsApp Business API"}) can successfully deliver messages
            </p>
          </div>
        </div>

        <form onSubmit={handleSendTestMessage} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Recipient Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="premium-input text-sm font-mono"
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">Include country code or 10-digit number</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Message Content
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Test message text..."
                  className="premium-input text-sm flex-1"
                />
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="btn-premium-primary text-xs !py-2 !px-4 flex items-center gap-1.5 shrink-0"
                >
                  {sendingTest ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send Test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ─── Recent WhatsApp Message Delivery Logs ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-navy-900 text-base">Recent WhatsApp Delivery Logs</h4>
              <p className="text-xs text-slate-500">Track delivery status and provider used for recent invoice dispatches</p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadLogs}
            disabled={loadingLogs}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin text-navy-600" : ""}`} />
            Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-400">No message dispatches logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Invoice / Ref</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-navy-900">{log.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.customerName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{log.recipientPhone}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.provider === "baileys"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {log.provider === "baileys" ? "Baileys" : "Business API"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.status === "simulated"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {log.status === "sent" ? "Sent" : log.status === "simulated" ? "Simulated" : "Failed"}
                      </span>
                      {log.error && <p className="text-[10px] text-rose-600 mt-0.5 max-w-xs truncate">{log.error}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
