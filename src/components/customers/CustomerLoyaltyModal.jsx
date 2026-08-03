import React, { useState, useEffect } from "react";
import { Award, X, PlusCircle, MinusCircle, RefreshCw, Calendar, FileText, ArrowUpRight, ArrowDownRight, SlidersHorizontal } from "lucide-react";
import { fetchCustomerPointsHistoryAPI, adjustCustomerPointsAPI } from "../../services/api";

export function CustomerLoyaltyModal({ customerId, onClose, onCustomerUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustType, setAdjustType] = useState("add"); // 'add' or 'subtract'
  const [adjustNotes, setAdjustNotes] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetchCustomerPointsHistoryAPI(customerId);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      loadHistory();
    }
  }, [customerId]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const ptsNum = parseInt(adjustPoints, 10);
    if (!ptsNum || isNaN(ptsNum)) return alert("Please enter valid points number");

    const finalPoints = adjustType === "subtract" ? -Math.abs(ptsNum) : Math.abs(ptsNum);

    setAdjusting(true);
    try {
      await adjustCustomerPointsAPI(customerId, { points: finalPoints, notes: adjustNotes });
      setShowAdjustForm(false);
      setAdjustPoints("");
      setAdjustNotes("");
      await loadHistory();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err) {
      alert(err.message || "Failed to adjust points");
    } finally {
      setAdjusting(false);
    }
  };

  if (!customerId) return null;

  const customer = data?.customer;
  const history = data?.history || [];
  const tier = customer?.loyaltyTier;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-2xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {customer?.name || "Customer Loyalty Ledger"}
                {tier && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: tier.badge_color || "#b45309" }}
                  >
                    {tier.name} ({tier.multiplier}x)
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Phone: {customer?.phone} • Lifetime Spend: ₹{Number(customer?.total_spend || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Overview Card */}
        <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-700 dark:text-pink-300">
              Current Points Balance
            </span>
            <div className="text-3xl font-extrabold text-pink-600 dark:text-pink-400 mt-0.5">
              {customer?.loyalty_points || 0} <span className="text-lg font-medium text-gray-500">Pts</span>
            </div>
          </div>

          <button
            onClick={() => setShowAdjustForm(!showAdjustForm)}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl text-sm shadow-sm flex items-center gap-2 transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showAdjustForm ? "Cancel Adjustment" : "Manual Adjustment"}
          </button>
        </div>

        {/* Manual Adjustment Form (Collapsible) */}
        {showAdjustForm && (
          <form onSubmit={handleAdjustSubmit} className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Adjust Customer Loyalty Points</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                  Action
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="add">+ Add (Credit Points)</option>
                  <option value="subtract">- Subtract (Debit Points)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                  Points Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="50"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Birthday bonus / Correction"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={adjusting}
                className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-medium shadow-sm disabled:opacity-50"
              >
                {adjusting ? "Updating..." : "Submit Adjustment"}
              </button>
            </div>
          </form>
        )}

        {/* Ledger Transaction History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Transaction History</h4>

          {loading ? (
            <div className="flex items-center justify-center p-8 text-pink-500">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No point transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const isPositive = item.points > 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isPositive
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                          <span className="capitalize">{item.type}</span>
                          {item.bill && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                              Bill #{item.bill.bill_number}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                          {item.tier_name && <span>Tier: {item.tier_name}</span>}
                          {item.notes && <span>• {item.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-base font-bold ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${item.points}` : item.points} Pts
                      </div>
                      <div className="text-xs text-gray-400">
                        Balance: {item.balance_after} Pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
