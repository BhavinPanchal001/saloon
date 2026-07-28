import { useState, useEffect } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchSettings, saveSettings, fetchPrinterStatusAPI, togglePrinterAPI, testPrintAPI, switchPrinterConnectionAPI, savePrinterSettingsAPI } from '../../services/api';
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { Bell, Lock, User, Moon, Globe, Shield, Mail, Smartphone, QrCode, CheckCircle, KeyRound, Printer, Usb, Wifi, Save, HelpCircle, Info, Package } from "lucide-react";

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    profile: { fullName: '', email: '', phone: '', timezone: '', language: '' },
    notifications: { emailAlerts: true, pushNotifications: true, marketingEmails: false, securityAlerts: true },
    appearance: { theme: 'light', compactMode: false, highContrast: false },
    security: { twoFactorEnabled: false, sessionTimeout: 30 },
    inventory: { allowOutOfStockCheckout: false },
  });
  const [activeTab, setActiveTab] = useState("profile");

  const setupTOTP = useAuthStore((state) => state.setupTOTP);
  const confirmTOTP = useAuthStore((state) => state.confirmTOTP);
  const disableTOTP = useAuthStore((state) => state.disableTOTP);

  const [totpStep, setTotpStep] = useState("idle");
  const [totpQrCode, setTotpQrCode] = useState(null);
  const [totpSecret, setTotpSecret] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(user?.totp_enabled || false);
  const [totpError, setTotpError] = useState(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  useEffect(() => {
    if (user) {
      setTotpEnabled(user.totp_enabled || false);
    }
  }, [user]);

  // Printer settings state
  const [printerStatus, setPrinterStatus] = useState({ enabled: false, connectionType: 'usb', vid: '', pid: '', ip: '', port: 9100, paperWidth: 48, deviceDetected: false });
  const [printerForm, setPrinterForm] = useState({ enabled: false, connectionType: 'usb', vid: '', pid: '', ip: '', port: 9100, paperWidth: 48 });
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerToggling, setPrinterToggling] = useState(false);
  const [printerSaving, setPrinterSaving] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);

  const handleSetupTOTP = async () => {
    setTotpLoading(true);
    setTotpError(null);
    try {
      const data = await setupTOTP();
      setTotpQrCode(data.qrCode);
      setTotpSecret(data.secret);
      setTotpStep("scan");
    } catch (err) {
      setTotpError(err.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleConfirmTOTP = async () => {
    if (!totpToken || totpToken.length !== 6) {
      setTotpError("Enter the 6-digit code from your app.");
      return;
    }
    setTotpLoading(true);
    setTotpError(null);
    try {
      await confirmTOTP(totpToken);
      setTotpEnabled(true);
      setTotpStep("enabled");
      setTotpToken("");
      toast.success("Authenticator app enabled!");
    } catch (err) {
      setTotpError(err.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisableTOTP = async () => {
    if (!disablePassword) {
      setTotpError("Enter your password to confirm.");
      return;
    }
    setTotpLoading(true);
    setTotpError(null);
    try {
      await disableTOTP(disablePassword);
      setTotpEnabled(false);
      setTotpStep("idle");
      setDisablePassword("");
      toast.success("Authenticator app disabled.");
    } catch (err) {
      setTotpError(err.message);
    } finally {
      setTotpLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await fetchSettings();
        setSettings((prev) => ({
          ...prev,
          ...data,
          inventory: {
            allowOutOfStockCheckout: false,
            ...data?.inventory,
          },
        }));
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
    fetchPrinterStatus();
  }, []);

  useEffect(() => {
    if (activeTab === "printer") {
      fetchPrinterStatus();
    }
  }, [activeTab]);

  const fetchPrinterStatus = async () => {
    setPrinterLoading(true);
    try {
      const status = await fetchPrinterStatusAPI();
      setPrinterStatus(status);
      setPrinterForm({
        enabled: status.enabled,
        connectionType: status.connectionType || 'usb',
        vid: status.vid || '',
        pid: status.pid || '',
        ip: status.ip || '',
        port: status.port || 9100,
        paperWidth: status.paperWidth || 48,
      });
    } catch (err) {
      console.error('Failed to fetch printer status:', err);
    } finally {
      setPrinterLoading(false);
    }
  };

  const handleTogglePrinter = async () => {
    setPrinterToggling(true);
    try {
      const updatedStatus = await togglePrinterAPI(!printerStatus.enabled);
      setPrinterStatus((prev) => ({ ...prev, enabled: updatedStatus.enabled }));
      setPrinterForm((prev) => ({ ...prev, enabled: updatedStatus.enabled }));
      toast.success(updatedStatus.message || `Printer ${updatedStatus.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to toggle printer state');
    } finally {
      setPrinterToggling(false);
    }
  };

  const handleConnectionTypeChange = async (type) => {
    try {
      const updatedStatus = await switchPrinterConnectionAPI(type);
      setPrinterStatus((prev) => ({ ...prev, connectionType: updatedStatus.connectionType }));
      setPrinterForm((prev) => ({ ...prev, connectionType: updatedStatus.connectionType }));
      toast.success(`Switched connection mode to ${type.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || 'Failed to switch connection mode');
    }
  };

  const handleSavePrinterSettings = async (e) => {
    e.preventDefault();
    setPrinterSaving(true);
    try {
      const updatedStatus = await savePrinterSettingsAPI(printerForm);
      setPrinterStatus(updatedStatus);
      toast.success(updatedStatus.message || 'Printer settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save printer settings');
    } finally {
      setPrinterSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    try {
      const res = await testPrintAPI();
      toast.success(res.message || 'Test receipt printed successfully!');
    } catch (err) {
      toast.error(err.message || 'Test print failed');
    } finally {
      setTestPrinting(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      setSettings((p) => ({
        ...p,
        profile: {
          ...p.profile,
          email: user.email,
          fullName: user.email.split("@")[0],
        },
      }));
    }
  }, [user]);

  const handleSave = async (section) => {
    setSaving(true);
    try {
      await saveSettings(settings);
      toast.success(`${section} settings saved successfully`);
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Moon },
    { id: "security", label: "Security", icon: Shield },
    { id: "inventory", label: "Inventory & POS", icon: Package },
    { id: "printer", label: "Printer", icon: Printer },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and system settings"
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Tabs */}
        <div className="lg:w-64">
          <div className="glass-card p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-navy-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="glass-card p-8">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-navy-900">Profile Information</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your personal information and contact details
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="label-text">Full Name</label>
                    <input
                      type="text"
                      value={settings.profile.fullName}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, fullName: e.target.value } })}
                      className="premium-input"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="label-text">Email Address</label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      disabled
                      className="premium-input bg-slate-50"
                    />
                    <p className="mt-1 text-xs text-slate-400">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="label-text">Phone Number</label>
                    <input
                      type="tel"
                      value={settings.profile.phone}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, phone: e.target.value } })}
                      className="premium-input"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div>
                    <label className="label-text">Time Zone</label>
                    <select
                      value={settings.profile.timezone}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, timezone: e.target.value } })}
                      className="premium-input"
                    >
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave("Profile")}
                    disabled={saving}
                    className="btn-premium-primary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-navy-900">Notification Preferences</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Control how you receive notifications and alerts
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: "emailAlerts",
                      label: "Email Alerts",
                      description: "Receive important updates via email",
                      icon: Mail,
                    },
                    {
                      key: "pushNotifications",
                      label: "Push Notifications",
                      description: "Get real-time notifications in your browser",
                      icon: Smartphone,
                    },
                    {
                      key: "marketingEmails",
                      label: "Marketing Emails",
                      description: "Receive product updates and promotional content",
                      icon: Globe,
                    },
                    {
                      key: "securityAlerts",
                      label: "Security Alerts",
                      description: "Get notified about security-related events",
                      icon: Shield,
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50">
                          <item.icon className="h-5 w-5 text-navy-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <p className="text-sm text-slate-500">{item.description}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications[item.key]}
                          onChange={(e) =>
                            setSettings({ ...settings, notifications: { ...settings.notifications, [item.key]: e.target.checked } })
                          }
                          className="peer sr-only"
                        />
                        <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-navy-600 peer-focus:ring-4 peer-focus:ring-navy-300"></div>
                        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave("Notification")}
                    disabled={saving}
                    className="btn-premium-primary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-navy-900">Appearance Settings</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Customize the look and feel of the application
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label-text">Theme</label>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                      {[
                        { id: "light", label: "Light", color: "bg-white" },
                        { id: "dark", label: "Dark", color: "bg-slate-900" },
                        { id: "auto", label: "Auto", color: "bg-gradient-to-r from-white to-slate-900" },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => setSettings({ ...settings, appearance: { ...settings.appearance, theme: theme.id } })}
                          className={`rounded-xl border-2 p-4 transition-all ${
                            settings.appearance.theme === theme.id
                              ? "border-navy-600 bg-navy-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className={`mx-auto mb-2 h-8 w-8 rounded-full border ${theme.color}`} />
                          <p className="text-sm font-medium">{theme.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <label className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-4">
                      <div>
                        <p className="font-medium text-slate-900">Compact Mode</p>
                        <p className="text-sm text-slate-500">Reduce spacing for denser layout</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.appearance.compactMode}
                        onChange={(e) =>
                          setSettings({ ...settings, appearance: { ...settings.appearance, compactMode: e.target.checked } })
                        }
                        className="h-5 w-5 rounded border-slate-300 text-navy-600"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-4">
                      <div>
                        <p className="font-medium text-slate-900">High Contrast</p>
                        <p className="text-sm text-slate-500">Increase contrast for better visibility</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.appearance.highContrast}
                        onChange={(e) =>
                          setSettings({ ...settings, appearance: { ...settings.appearance, highContrast: e.target.checked } })
                        }
                        className="h-5 w-5 rounded border-slate-300 text-navy-600"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave("Appearance")}
                    disabled={saving}
                    className="btn-premium-primary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-navy-900">Security Settings</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage your account security and authentication options
                  </p>
                </div>

                 <div className="space-y-4">
                  {/* Authenticator App (TOTP) */}
                  <div className="rounded-xl border border-slate-100 bg-white/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${totpEnabled ? "bg-brand-50" : "bg-navy-50"}`}>
                          <QrCode className={`h-5 w-5 ${totpEnabled ? "text-brand-600" : "text-navy-600"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Authenticator App (TOTP)</p>
                          <p className="text-sm text-slate-500">
                            {totpEnabled
                              ? "Google Authenticator / Authy is active."
                              : "Use Google Authenticator or Authy to add an extra layer of security."}
                          </p>
                        </div>
                      </div>
                      {totpEnabled ? (
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">Active</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Inactive</span>
                      )}
                    </div>

                    {totpError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {totpError}
                      </div>
                    )}

                    {/* Step: idle — not yet set up */}
                    {totpStep === "idle" && !totpEnabled && (
                      <button
                        onClick={handleSetupTOTP}
                        disabled={totpLoading}
                        className="btn-premium-primary"
                      >
                        {totpLoading ? "Loading..." : "Set up authenticator app"}
                      </button>
                    )}

                    {/* Step: scan QR */}
                    {totpStep === "scan" && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                          Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>, then enter the 6-digit code to confirm.
                        </p>
                        <div className="flex justify-center">
                          <img src={totpQrCode} alt="TOTP QR Code" className="h-48 w-48 rounded-xl border border-slate-200" />
                        </div>
                        <details className="text-xs text-slate-400">
                          <summary className="cursor-pointer select-none">Can't scan? Enter key manually</summary>
                          <p className="mt-2 break-all font-mono text-slate-600 bg-slate-50 rounded-lg p-3">{totpSecret}</p>
                        </details>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpToken}
                            onChange={(e) => { setTotpToken(e.target.value.replace(/\D/g, "")); setTotpError(null); }}
                            placeholder="000000"
                            className="input-field w-40 text-center font-mono tracking-widest text-lg"
                          />
                          <button
                            onClick={handleConfirmTOTP}
                            disabled={totpLoading || totpToken.length !== 6}
                            className="btn-premium-primary flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            {totpLoading ? "Verifying..." : "Confirm & Enable"}
                          </button>
                        </div>
                        <button
                          onClick={() => { setTotpStep("idle"); setTotpError(null); setTotpToken(""); }}
                          className="text-sm text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Step: enabled — show disable option */}
                    {(totpEnabled || totpStep === "enabled" || totpStep === "disabling") && (
                      <div className="space-y-3">
                        {totpStep !== "disabling" && (
                          <button
                            onClick={() => { setTotpStep("disabling"); setTotpError(null); }}
                            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            Disable authenticator app
                          </button>
                        )}
                        {totpStep === "disabling" && (
                          <div className="space-y-3">
                            <p className="text-sm text-slate-600">Enter your password to confirm removal.</p>
                            <div className="flex gap-3">
                              <input
                                type="password"
                                value={disablePassword}
                                onChange={(e) => { setDisablePassword(e.target.value); setTotpError(null); }}
                                placeholder="Your password"
                                className="input-field flex-1"
                              />
                              <button
                                onClick={handleDisableTOTP}
                                disabled={totpLoading}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                              >
                                {totpLoading ? "Disabling..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => { setTotpStep("enabled"); setTotpError(null); setDisablePassword(""); }}
                                className="text-sm text-slate-500 hover:text-slate-700 px-2"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50">
                          <Shield className="h-5 w-5 text-navy-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Change Password</p>
                          <p className="text-sm text-slate-500">Update your account password</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toast.info("Password change functionality coming soon")}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50">
                          <Smartphone className="h-5 w-5 text-navy-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Session Timeout</p>
                          <p className="text-sm text-slate-500">
                            Auto logout after {settings.security.sessionTimeout} minutes of inactivity
                          </p>
                        </div>
                      </div>
                      <select
                        value={settings.security.sessionTimeout}
                        onChange={(e) =>
                          setSettings({ ...settings, security: { ...settings.security, sessionTimeout: Number(e.target.value) } })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave("Security")}
                    disabled={saving}
                    className="btn-premium-primary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Inventory & POS Tab */}
            {activeTab === "inventory" && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-semibold text-navy-900">Inventory & POS Settings</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure inventory rules and POS checkout behaviors
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1 max-w-lg">
                      <label className="text-sm font-bold text-navy-900 block cursor-pointer" htmlFor="allowOutOfStockCheckout">
                        Allow Out-of-Stock Checkout
                      </label>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        When enabled, users will be able to check out and generate bills for products even when stock is zero or insufficient.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="allowOutOfStockCheckout"
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.inventory?.allowOutOfStockCheckout || false}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            inventory: {
                              ...settings.inventory,
                              allowOutOfStockCheckout: e.target.checked,
                            },
                          })
                        }
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-900"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave("Inventory")}
                    className="btn-premium-primary flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Inventory Settings"}
                  </button>
                </div>
              </div>
            )}

            {/* Printer Tab */}
            {activeTab === "printer" && (
              <form onSubmit={handleSavePrinterSettings} className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-navy-900">Thermal Printer Settings</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure your POS thermal printer details directly from the web interface
                  </p>
                </div>

                {printerLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Thermal Printing Enable Switch */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            printerForm.enabled ? 'bg-emerald-50' : 'bg-slate-100'
                          }`}>
                            <Printer className={`h-6 w-6 ${printerForm.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-navy-900">Enable Thermal Printing</p>
                            <p className="text-sm text-slate-500">
                              {printerForm.enabled
                                ? 'Receipts will automatically print after successful checkout'
                                : 'Thermal printing is currently disabled'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={printerForm.enabled}
                            onChange={handleTogglePrinter}
                            disabled={printerToggling}
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-emerald-500 peer-focus:ring-4 peer-focus:ring-emerald-300"></div>
                          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6"></div>
                        </label>
                      </div>
                    </div>

                    {/* Connection Type Selector */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3">Connection Type</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleConnectionTypeChange('usb')}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                            printerForm.connectionType === 'usb'
                              ? 'border-navy-500 bg-navy-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <Usb className={`h-5 w-5 ${printerForm.connectionType === 'usb' ? 'text-navy-600' : 'text-slate-400'}`} />
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${printerForm.connectionType === 'usb' ? 'text-navy-900' : 'text-slate-600'}`}>USB Connection</p>
                            <p className="text-xs text-slate-400">Plugged directly into PC via USB cable</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnectionTypeChange('network')}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                            printerForm.connectionType === 'network'
                              ? 'border-navy-500 bg-navy-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <Wifi className={`h-5 w-5 ${printerForm.connectionType === 'network' ? 'text-navy-600' : 'text-slate-400'}`} />
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${printerForm.connectionType === 'network' ? 'text-navy-900' : 'text-slate-600'}`}>Network Connection</p>
                            <p className="text-xs text-slate-400">Connected via Wi-Fi or LAN cable (IP address)</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Printer Configuration Form Fields */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-5 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-1">
                        {printerForm.connectionType === 'usb' ? 'USB Hardware Identifiers' : 'Network Communication Details'}
                      </p>

                      {printerForm.connectionType === 'usb' ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Vendor ID (VID)
                              </label>
                              <input
                                type="text"
                                value={printerForm.vid}
                                onChange={(e) => setPrinterForm({ ...printerForm, vid: e.target.value })}
                                placeholder="e.g. 0416"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">USB Vendor ID (Hexadecimal code)</p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Product ID (PID)
                              </label>
                              <input
                                type="text"
                                value={printerForm.pid}
                                onChange={(e) => setPrinterForm({ ...printerForm, pid: e.target.value })}
                                placeholder="e.g. 5011"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">USB Product ID (Hexadecimal code)</p>
                            </div>
                          </div>

                          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-navy-900">
                              <HelpCircle className="h-4 w-4 text-navy-600" />
                              How to find VID & PID on Windows:
                            </div>
                            <ol className="list-decimal list-inside space-y-0.5 text-slate-500 pl-1">
                              <li>Open <b>Device Manager</b> from Windows Start menu.</li>
                              <li>Look under <b>Printers</b> or <b>Universal Serial Bus controllers</b>.</li>
                              <li>Right click printer &rarr; <b>Properties</b> &rarr; <b>Details</b> tab &rarr; select <b>Hardware Ids</b>.</li>
                              <li>Enter the 4-digit hexadecimal numbers for VID and PID above.</li>
                            </ol>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Printer IP Address
                              </label>
                              <input
                                type="text"
                                value={printerForm.ip}
                                onChange={(e) => setPrinterForm({ ...printerForm, ip: e.target.value })}
                                placeholder="e.g. 192.168.1.100"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">IP address assigned to thermal printer on LAN</p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Network Port
                              </label>
                              <input
                                type="number"
                                value={printerForm.port}
                                onChange={(e) => setPrinterForm({ ...printerForm, port: e.target.value })}
                                placeholder="9100"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">Standard RAW printing port (usually 9100)</p>
                            </div>
                          </div>

                          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-navy-900">
                              <Info className="h-4 w-4 text-navy-600" />
                              How to find printer IP address:
                            </div>
                            <p className="text-slate-500">
                              Turn off the printer. Hold down the <b>FEED</b> button while switching power ON. The printer will print a Self-Test receipt displaying its assigned IP Address and Port.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Paper Size Option */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3">Paper Width</p>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center justify-between rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                          Number(printerForm.paperWidth) === 48
                            ? 'border-navy-500 bg-navy-50/60'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paperWidth"
                              value={48}
                              checked={Number(printerForm.paperWidth) === 48}
                              onChange={() => setPrinterForm({ ...printerForm, paperWidth: 48 })}
                              className="text-navy-600 focus:ring-navy-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-navy-900">80mm Paper Roll</p>
                              <p className="text-xs text-slate-500">48 characters per line (Standard POS)</p>
                            </div>
                          </div>
                        </label>

                        <label className={`flex items-center justify-between rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                          Number(printerForm.paperWidth) === 32
                            ? 'border-navy-500 bg-navy-50/60'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paperWidth"
                              value={32}
                              checked={Number(printerForm.paperWidth) === 32}
                              onChange={() => setPrinterForm({ ...printerForm, paperWidth: 32 })}
                              className="text-navy-600 focus:ring-navy-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-navy-900">58mm Paper Roll</p>
                              <p className="text-xs text-slate-500">32 characters per line (Compact)</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Status summary banner */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${printerStatus.deviceDetected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                        <p className="text-xs font-medium text-slate-700">
                          {printerStatus.deviceDetected
                            ? `Status: Printer configured and detected (${printerForm.connectionType.toUpperCase()})`
                            : `Status: Printer not detected (${printerForm.connectionType.toUpperCase()})`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestPrint}
                        disabled={testPrinting || !printerForm.enabled}
                        className="btn-premium-primary !py-2 !px-4 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testPrinting ? (
                          <span className="flex items-center gap-2">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Printing...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Printer className="h-3.5 w-3.5" />
                            Test Print
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={printerSaving}
                        className="btn-premium-primary flex items-center gap-2"
                      >
                        {printerSaving ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Saving Settings...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Printer Settings
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
