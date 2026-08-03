import React, { useState, useEffect } from "react";
import { Award, Save, Plus, Edit2, Trash2, ShieldCheck, Crown, Zap, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import {
  fetchRewardSettingsAPI,
  updateRewardSettingsAPI,
  fetchRewardTiersAPI,
  createRewardTierAPI,
  updateRewardTierAPI,
  deleteRewardTierAPI,
} from "../../services/api";

export function RewardSettingsTab() {
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
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Tier modal state
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTierId, setEditingTierId] = useState(null);
  const [tierForm, setTierForm] = useState({
    name: "",
    min_spend: "0",
    multiplier: "1.0",
    badge_color: "#b45309",
    icon: "Award",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resSet, resTiers] = await Promise.all([
        fetchRewardSettingsAPI(),
        fetchRewardTiersAPI(),
      ]);
      if (resSet.success && resSet.settings) {
        setSettings(resSet.settings);
      }
      if (resTiers.success && resTiers.tiers) {
        setTiers(resTiers.tiers);
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Failed to load reward settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await updateRewardSettingsAPI(settings);
      setMsg({ type: "success", text: "Reward settings updated successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to update settings." });
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
    try {
      if (editingTierId) {
        await updateRewardTierAPI(editingTierId, tierForm);
      } else {
        await createRewardTierAPI(tierForm);
      }
      setShowTierModal(false);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to save tier");
    }
  };

  const handleDeleteTier = async (id) => {
    if (!window.confirm("Are you sure you want to delete this loyalty tier?")) return;
    try {
      await deleteRewardTierAPI(id);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to delete tier");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            Customer Reward & Loyalty Program
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure point accumulation rates, redemption rules, and tier earn multipliers.
          </p>
        </div>
      </div>

      {msg.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Global Rules Section */}
      <form onSubmit={handleSaveSettings} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Point Earning & Redemption Rules</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base Spend per Point (₹)
            </label>
            <input
              type="number"
              min="1"
              value={settings.earn_spend_per_point}
              onChange={(e) => setSettings({ ...settings, earn_spend_per_point: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
              placeholder="100"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Amount spent on bills to earn 1 base loyalty point.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Point Value in Cash (₹ per Point)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={settings.point_monetary_value}
              onChange={(e) => setSettings({ ...settings, point_monetary_value: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
              placeholder="1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Monetary discount value per 1 loyalty point (e.g., 1 Point = ₹1).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Points Required to Redeem
            </label>
            <input
              type="number"
              min="0"
              value={settings.min_points_to_redeem}
              onChange={(e) => setSettings({ ...settings, min_points_to_redeem: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
              placeholder="10"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum points balance a customer must have before redeeming.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maximum Bill Discount Cap (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.max_redeem_percentage}
              onChange={(e) => setSettings({ ...settings, max_redeem_percentage: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
              placeholder="50"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Maximum percentage of bill subtotal that can be paid using points.</p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Earning & Redemption Rules"}
          </button>
        </div>
      </form>

      {/* Tier Levels Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Membership Tiers & Multipliers</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Customers unlock tiers based on cumulative lifetime spend and earn points with tier multipliers.
            </p>
          </div>
          <button
            onClick={handleOpenAddTier}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-medium rounded-xl flex items-center gap-2 text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Loyalty Tier
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white font-semibold">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Tier Name</th>
                <th className="py-3 px-4">Min. Spend (₹)</th>
                <th className="py-3 px-4">Earn Multiplier</th>
                <th className="py-3 px-4">Badge Color</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {tiers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                  <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: t.badge_color || "#b45309" }}
                    />
                    {t.name}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">₹{Number(t.min_spend).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-xs">
                      {t.multiplier}x Points
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: t.badge_color }} />
                      {t.badge_color}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditTier(t)}
                        className="p-1.5 text-gray-500 hover:text-pink-600 dark:hover:text-pink-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit Tier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTier(t.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Delete Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingTierId ? "Edit Loyalty Tier" : "Add Loyalty Tier"}
            </h3>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Tier Name
                </label>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  placeholder="Gold, Platinum, VIP..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Minimum Lifetime Spend (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tierForm.min_spend}
                  onChange={(e) => setTierForm({ ...tierForm, min_spend: e.target.value })}
                  placeholder="20000"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Point Multiplier (e.g. 1.25, 1.5, 2.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={tierForm.multiplier}
                  onChange={(e) => setTierForm({ ...tierForm, multiplier: e.target.value })}
                  placeholder="1.5"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Badge Color (Hex)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tierForm.badge_color}
                    onChange={(e) => setTierForm({ ...tierForm, badge_color: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tierForm.badge_color}
                    onChange={(e) => setTierForm({ ...tierForm, badge_color: e.target.value })}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowTierModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-sm"
                >
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
