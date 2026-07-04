import { useState, useEffect } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchSettings, saveSettings } from '../../services/mockApi';
import { fetchPrinterStatusAPI, togglePrinterAPI, testPrintAPI } from '../../services/api';
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { Bell, Lock, User, Moon, Globe, Shield, Mail, Smartphone, QrCode, CheckCircle, KeyRound, Printer } from "lucide-react";

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
  const [printerStatus, setPrinterStatus] = useState({ enabled: false, vid: null, pid: null, deviceDetected: false });
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerToggling, setPrinterToggling] = useState(false);
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
      try {
        setLoading(true);
        const data = await fetchSettings();
        setSettings(data);
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Load printer status when printer tab is active
  useEffect(() => {
    if (activeTab === 'printer') {
      const loadPrinterStatus = async () => {
        setPrinterLoading(true);
        try {
          const status = await fetchPrinterStatusAPI();
          setPrinterStatus(status);
        } catch (err) {
          toast.error('Failed to load printer status');
        } finally {
          setPrinterLoading(false);
        }
      };
      loadPrinterStatus();
    }
  }, [activeTab]);

  const handlePrinterToggle = async () => {
    setPrinterToggling(true);
    try {
      const result = await togglePrinterAPI(!printerStatus.enabled);
      setPrinterStatus(result);
      toast.success(result.message || `Printing ${result.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to toggle printer');
    } finally {
      setPrinterToggling(false);
    }
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    try {
      const result = await testPrintAPI();
      toast.success(result.message || 'Test receipt printed!');
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

            {/* Printer Tab */}
            {activeTab === "printer" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-navy-900">Thermal Printer Settings</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure your POS thermal printer for automatic receipt printing
                  </p>
                </div>

                {printerLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Printer Status */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            printerStatus.enabled ? 'bg-emerald-50' : 'bg-slate-100'
                          }`}>
                            <Printer className={`h-6 w-6 ${printerStatus.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-navy-900">Thermal Printing</p>
                            <p className="text-sm text-slate-500">
                              {printerStatus.enabled
                                ? 'Receipts will auto-print after checkout'
                                : 'Printing is disabled — receipts won\'t print automatically'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={printerStatus.enabled}
                            onChange={handlePrinterToggle}
                            disabled={printerToggling}
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-emerald-500 peer-focus:ring-4 peer-focus:ring-emerald-300"></div>
                          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6"></div>
                        </label>
                      </div>
                    </div>

                    {/* Connection Status */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-5">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          printerStatus.deviceDetected ? 'bg-emerald-50' : 'bg-amber-50'
                        }`}>
                          <div className={`h-3 w-3 rounded-full ${
                            printerStatus.deviceDetected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">USB Connection</p>
                          <p className="text-sm text-slate-500">
                            {printerStatus.deviceDetected
                              ? 'Printer detected and ready'
                              : 'No USB printer detected — connect your printer and refresh'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Configuration Info */}
                    <div className="rounded-xl border border-slate-100 bg-white/50 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3">Configuration</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Vendor ID (VID)</p>
                          <p className="text-sm font-mono font-semibold text-navy-900">
                            {printerStatus.vid || <span className="text-slate-400 font-normal">Not set</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Product ID (PID)</p>
                          <p className="text-sm font-mono font-semibold text-navy-900">
                            {printerStatus.pid || <span className="text-slate-400 font-normal">Not set</span>}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-400">
                        To change VID/PID, edit the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">.env</code> file and restart the server.
                      </p>
                    </div>

                    {/* Test Print */}
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Test Print</p>
                          <p className="text-sm text-slate-500">
                            Send a small test receipt to verify your printer is working
                          </p>
                        </div>
                        <button
                          onClick={handleTestPrint}
                          disabled={testPrinting || !printerStatus.enabled}
                          className="btn-premium-primary !py-2.5 !px-5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testPrinting ? (
                            <span className="flex items-center gap-2">
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Printing...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Printer className="h-4 w-4" />
                              Print Test Page
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
