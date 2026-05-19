import { useState, useEffect } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchSettings, saveSettings } from '../../services/mockApi';
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { Bell, Lock, User, Moon, Globe, Shield, Mail, Smartphone } from "lucide-react";

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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences and system settings"
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
                  <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50">
                          <Lock className="h-5 w-5 text-navy-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                          <p className="text-sm text-slate-500">Add an extra layer of security</p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setSettings({ ...settings, security: { ...settings.security, twoFactorEnabled: !settings.security.twoFactorEnabled } })
                        }
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          settings.security.twoFactorEnabled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {settings.security.twoFactorEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
