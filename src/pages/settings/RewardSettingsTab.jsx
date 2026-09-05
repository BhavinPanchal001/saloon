import React, { useState, useEffect } from "react";
import {
  Award,
  Save,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Crown,
  Zap,
  Sparkles,
  Coins,
  Percent,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Gift,
  Check,
  X
} from "lucide-react";
import {
  fetchRewardSettingsAPI,
  updateRewardSettingsAPI,
  fetchRewardTiersAPI,
  createRewardTierAPI,
  updateRewardTierAPI,
  deleteRewardTierAPI,
} from "../../services/api";
import { useToastStore } from "../../stores/toastStore";

const COLOR_PRESETS = [
  { name: "Bronze", hex: "#92400e" },
  { name: "Silver", hex: "#475569" },
  { name: "Gold", hex: "#b45309" },
  { name: "Platinum", hex: "#4c1d95" },
  { name: "Emerald", hex: "#047857" },
  { name: "Sapphire", hex: "#0369a1" },
  { name: "Ruby", hex: "#be123c" },
];

const ICONS = [
  { id: "Award", label: "Award", icon: Award },
  { id: "Crown", label: "Crown", icon: Crown },
  { id: "ShieldCheck", label: "Shield", icon: ShieldCheck },
  { id: "Zap", label: "Zap", icon: Zap },
];

export function RewardSettingsTab() {
  const toast = useToastStore();
  const [settings, setSettings] = useState({
    earn_spend_per_point: "100",
    point_monetary_value: "1",
    min_points_to_redeem: "10",
    max_redeem_percentage: "50",
    enable_whatsapp_notifications: "true",
  });
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Tier modal state
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTierId, setEditingTierId] = useState(null);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierForm, setTierForm] = useState({
    name: "",
    min_spend: "0",
    multiplier: "1.0",
    badge_color: "#b45309",
    icon: "Award",
  });

  // Delete confirmation modal
  const [deletingTier, setDeletingTier] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [resSet, resTiers] = await Promise.all([
        fetchRewardSettingsAPI().catch((e) => ({ success: false, error: e })),
        fetchRewardTiersAPI().catch((e) => ({ success: false, error: e })),
      ]);

      if (resSet?.success && resSet.settings) {
        setSettings((prev) => ({ ...prev, ...resSet.settings }));
      }
      if (resTiers?.success && Array.isArray(resTiers.tiers)) {
        setTiers(resTiers.tiers);
      } else if (!resSet?.success && !resTiers?.success) {
        setLoadError("Unable to connect to reward service. Using offline defaults.");
      }
    } catch (err) {
      console.error("Reward settings fetch error:", err);
      setLoadError("Failed to fetch settings from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await updateRewardSettingsAPI(settings);
      toast.success("Reward rules updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update reward settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddTier = () => {
    setEditingTierId(null);
    setTierForm({
      name: "",
      min_spend: "0",
      multiplier: "1.0",
      badge_color: "#b45309",
      icon: "Award",
    });
    setShowTierModal(true);
  };

  const handleEditTier = (tier) => {
    setEditingTierId(tier.id);
    setTierForm({
      name: tier.name || "",
      min_spend: String(tier.min_spend || 0),
      multiplier: String(tier.multiplier || 1.0),
      badge_color: tier.badge_color || "#b45309",
      icon: tier.icon || "Award",
    });
    setShowTierModal(true);
  };

  const handleSaveTier = async (e) => {
    e.preventDefault();
    if (!tierForm.name.trim()) {
      toast.error("Please provide a tier name.");
      return;
    }
    setTierSaving(true);
    try {
      if (editingTierId) {
        await updateRewardTierAPI(editingTierId, tierForm);
        toast.success(`Updated "${tierForm.name}" tier successfully!`);
      } else {
        await createRewardTierAPI(tierForm);
        toast.success(`Created "${tierForm.name}" tier successfully!`);
      }
      setShowTierModal(false);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to save loyalty tier.");
    } finally {
      setTierSaving(false);
    }
  };

  const handleSeedDefaultTiers = async () => {
    const DEFAULT_TIERS = [
      { name: "Bronze", min_spend: "0", multiplier: "1.0", badge_color: "#92400e", icon: "Award" },
      { name: "Silver", min_spend: "5000", multiplier: "1.25", badge_color: "#475569", icon: "ShieldCheck" },
      { name: "Gold", min_spend: "20000", multiplier: "1.5", badge_color: "#b45309", icon: "Crown" },
      { name: "Platinum", min_spend: "50000", multiplier: "2.0", badge_color: "#4c1d95", icon: "Zap" },
    ];

    setLoading(true);
    try {
      for (const tier of DEFAULT_TIERS) {
        await createRewardTierAPI(tier).catch(() => {});
      }
      toast.success("Default loyalty tiers (Bronze, Silver, Gold, Platinum) created!");
      await loadData();
    } catch (err) {
      toast.error(err.message || "Failed to create default tiers.");
      setLoading(false);
    }
  };

  const handleConfirmDeleteTier = async () => {
    if (!deletingTier) return;
    try {
      await deleteRewardTierAPI(deletingTier.id);
      toast.success(`Tier "${deletingTier.name}" deleted.`);
      setDeletingTier(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to delete tier.");
    }
  };

  const renderTierIcon = (iconName, className = "w-5 h-5") => {
    switch (iconName) {
      case "Crown":
        return <Crown className={className} />;
      case "ShieldCheck":
        return <ShieldCheck className={className} />;
      case "Zap":
        return <Zap className={className} />;
      case "Award":
      default:
        return <Award className={className} />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400">
        <RefreshCw className="w-8 h-8 text-gold-600 animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-800">
          Loading Loyalty & Reward Settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-100/60 pb-5">
        <div>
          <h2 className="text-xl font-bold font-serif text-navy-900 flex items-center gap-2.5">
            <Award className="h-6 w-6 text-gold-600" />
            Customer Reward & Loyalty Program
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure spend-to-point accumulation rates, checkout redemption rules, and customer membership tiers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn-premium-primary inline-flex items-center gap-2 !py-2.5 !px-5 text-xs font-bold self-start sm:self-auto"
        >
          {saving ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Saving Rules...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Reward Rules
            </>
          )}
        </button>
      </div>

      {/* Graceful error / connection notice */}
      {loadError && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── 1. Point Earning & Redemption Rules Card ─── */}
      <div className="rounded-2xl border border-navy-100/80 bg-white/90 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gold-50 border border-gold-200/60 flex items-center justify-center text-gold-700 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-900">Point Earning & Redemption Rules</h3>
              <p className="text-[11px] text-slate-500">
                Define the monetary value of reward points and restrictions when redeeming at POS.
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
            <Check className="w-3 h-3" /> System Active
          </span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Rule 1: Spend per point */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-navy-100 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-text !mb-0 text-navy-800">Base Spend per Point (₹)</label>
                <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200/50">
                  Earn Rate
                </span>
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  value={settings.earn_spend_per_point}
                  onChange={(e) => setSettings({ ...settings, earn_spend_per_point: e.target.value })}
                  className="premium-input !pl-8 text-sm font-bold text-navy-900"
                  placeholder="100"
                  required
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Amount the customer must spend on a bill to earn <strong className="text-navy-900">1 base point</strong>. (e.g. ₹{settings.earn_spend_per_point || 100} = 1 Point).
              </p>
            </div>

            {/* Rule 2: Cash value per point */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-navy-100 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-text !mb-0 text-navy-800">Point Value in Cash (₹ per Point)</label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                  Discount Value
                </span>
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={settings.point_monetary_value}
                  onChange={(e) => setSettings({ ...settings, point_monetary_value: e.target.value })}
                  className="premium-input !pl-8 text-sm font-bold text-navy-900"
                  placeholder="1"
                  required
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Monetary discount deducted from bill for each redeemed point. (e.g. 1 Point = <strong className="text-navy-900">₹{settings.point_monetary_value || 1} Off</strong>).
              </p>
            </div>

            {/* Rule 3: Minimum points to redeem */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-navy-100 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-text !mb-0 text-navy-800">Minimum Points Required to Redeem</label>
                <span className="text-[10px] font-bold text-navy-600 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                  Threshold
                </span>
              </div>
              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  value={settings.min_points_to_redeem}
                  onChange={(e) => setSettings({ ...settings, min_points_to_redeem: e.target.value })}
                  className="premium-input text-sm font-bold text-navy-900"
                  placeholder="10"
                  required
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Minimum points balance a customer must reach before they can redeem any points at POS.
              </p>
            </div>

            {/* Rule 4: Max redeem percentage */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-navy-100 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-text !mb-0 text-navy-800">Maximum Bill Discount Cap (%)</label>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                  Safeguard Cap
                </span>
              </div>
              <div className="relative mt-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.max_redeem_percentage}
                  onChange={(e) => setSettings({ ...settings, max_redeem_percentage: e.target.value })}
                  className="premium-input text-sm font-bold text-navy-900"
                  placeholder="50"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  %
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Maximum percentage of the bill subtotal that can be paid using points (prevents 100% free bills if desired).
              </p>
            </div>
          </div>

          {/* Quick Simulation Banner */}
          <div className="rounded-xl border border-navy-100/60 bg-gradient-to-r from-gold-50/40 via-cream to-navy-50/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white border border-gold-200 flex items-center justify-center text-gold-600 shadow-2xs shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-navy-900">Example Rule Summary:</span>
                <span className="text-slate-600 ml-1.5">
                  A ₹1,000 spend gives <strong className="text-navy-900">{Math.floor(1000 / (Number(settings.earn_spend_per_point) || 100))} base points</strong>. 
                  Redeeming 20 points gives <strong className="text-emerald-700">₹{(20 * (Number(settings.point_monetary_value) || 1)).toFixed(2)} off</strong> (up to {settings.max_redeem_percentage}% of bill).
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-premium-primary inline-flex items-center gap-2 !py-2 !px-4 text-xs shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Rules"}
            </button>
          </div>
        </form>
      </div>

      {/* ─── 2. Membership Tiers & Multipliers Section ─── */}
      <div className="rounded-2xl border border-navy-100/80 bg-white/90 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy-900">Membership Tiers & Multipliers</h3>
              <span className="px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 text-[10px] font-bold border border-navy-100">
                {tiers.length} Tiers Configured
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Customers unlock higher tiers automatically as their cumulative lifetime spend increases.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddTier}
            className="btn-premium-accent inline-flex items-center gap-2 !py-2 !px-4 text-xs font-bold self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Loyalty Tier
          </button>
        </div>

        {/* Tier Cards Showcase */}
        {tiers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((t) => (
              <div
                key={t.id}
                className="group relative rounded-2xl border border-navy-100 bg-white p-5 shadow-2xs hover:shadow-md hover:border-gold-300 transition-all flex flex-col justify-between"
              >
                {/* Top accent bar matching badge color */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
                  style={{ backgroundColor: t.badge_color || "#b45309" }}
                />

                <div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                        style={{ backgroundColor: t.badge_color || "#b45309" }}
                      >
                        {renderTierIcon(t.icon, "w-4 h-4")}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-navy-900">{t.name}</h4>
                        <span className="text-[10px] font-medium text-slate-400">Tier Level</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEditTier(t)}
                        className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Tier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTier(t)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Multiplier Badge */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold-50 border border-gold-200 text-gold-800 font-extrabold text-xs">
                      <Sparkles className="w-3 h-3 text-gold-600" />
                      {t.multiplier}× Points
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Multiplier</span>
                  </div>

                  {/* Min Spend requirement */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Lifetime Spend Required
                    </div>
                    <div className="text-base font-bold text-navy-900 mt-0.5">
                      ₹{Number(t.min_spend).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Footer preview */}
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300 inline-block shadow-2xs"
                      style={{ backgroundColor: t.badge_color || "#b45309" }}
                    />
                    <span>{t.badge_color || "#b45309"}</span>
                  </div>
                  <span className="font-sans font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed border-navy-100 bg-slate-50/50 text-center">
            <Award className="w-10 h-10 text-slate-300 mb-2" />
            <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">No Loyalty Tiers Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Create your first membership tier (e.g. Bronze, Silver, Gold) to reward repeat salon guests.
            </p>
            <button
              type="button"
              onClick={handleSeedDefaultTiers}
              className="btn-premium-accent inline-flex items-center gap-2 !py-2 !px-4 text-xs font-bold mt-4 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Default Tiers (Bronze, Silver, Gold, Platinum)
            </button>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Tier Modal ─── */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-navy-100 space-y-5">
            <div className="flex items-center justify-between border-b border-navy-100/60 pb-3">
              <h3 className="text-base font-bold font-serif text-navy-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-gold-600" />
                {editingTierId ? "Edit Loyalty Tier" : "Add Loyalty Tier"}
              </h3>
              <button
                type="button"
                onClick={() => setShowTierModal(false)}
                className="text-slate-400 hover:text-navy-900 transition p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div>
                <label className="label-text">Tier Name</label>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  placeholder="e.g. Gold, Platinum, VIP..."
                  className="premium-input text-sm font-bold text-navy-900"
                  required
                />
              </div>

              <div>
                <label className="label-text">Minimum Lifetime Spend (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={tierForm.min_spend}
                    onChange={(e) => setTierForm({ ...tierForm, min_spend: e.target.value })}
                    placeholder="20000"
                    className="premium-input !pl-8 text-sm font-bold text-navy-900"
                    required
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Customer automatically enters this tier once their cumulative spend reaches this threshold.
                </p>
              </div>

              <div>
                <label className="label-text">Point Multiplier</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    value={tierForm.multiplier}
                    onChange={(e) => setTierForm({ ...tierForm, multiplier: e.target.value })}
                    placeholder="1.5"
                    className="premium-input text-sm font-bold text-navy-900"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    × Base Points
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  e.g. 1.5× means this tier earns 15 points instead of 10 base points on a ₹1,000 bill.
                </p>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="label-text">Badge Icon</label>
                <div className="grid grid-cols-4 gap-2">
                  {ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = tierForm.icon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTierForm({ ...tierForm, icon: item.id })}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs font-bold ${
                          isSelected
                            ? "border-navy-900 bg-navy-900 text-white shadow-2xs"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <IconComp className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Badge Color & Presets */}
              <div>
                <label className="label-text">Badge Color</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setTierForm({ ...tierForm, badge_color: preset.hex })}
                      className="px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-2xs hover:opacity-90 transition flex items-center gap-1"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {tierForm.badge_color === preset.hex && <Check className="w-2.5 h-2.5" />}
                      {preset.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tierForm.badge_color}
                    onChange={(e) => setTierForm({ ...tierForm, badge_color: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tierForm.badge_color}
                    onChange={(e) => setTierForm({ ...tierForm, badge_color: e.target.value })}
                    className="premium-input font-mono text-xs uppercase"
                    placeholder="#B45309"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTierModal(false)}
                  className="btn-premium-outline !py-2 !px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tierSaving}
                  className="btn-premium-primary !py-2 !px-5 text-xs font-bold"
                >
                  {tierSaving ? "Saving..." : editingTierId ? "Save Changes" : "Create Tier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deletingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-navy-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">Delete Loyalty Tier?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove the <strong className="text-navy-900">"{deletingTier.name}"</strong> tier? 
                Existing customers assigned to this tier will be re-evaluated on their next visit.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTier(null)}
                className="btn-premium-outline !py-2 !px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTier}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Delete Tier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
