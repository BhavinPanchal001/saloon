import React, { useState, useEffect } from "react";
import {
  Award,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Sparkles,
  Save,
  Check
} from "lucide-react";
import { fetchCustomerPointsHistoryAPI, adjustCustomerPointsAPI } from "../../services/api";
import { useToastStore } from "../../stores/toastStore";

export function CustomerLoyaltyModal({ customerId, onClose, onCustomerUpdated }) {
  const toast = useToastStore();
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
    if (!ptsNum || isNaN(ptsNum)) {
      toast.error("Please enter a valid number of points");
      return;
    }

    const finalPoints = adjustType === "subtract" ? -Math.abs(ptsNum) : Math.abs(ptsNum);

    setAdjusting(true);
    try {
      await adjustCustomerPointsAPI(customerId, { points: finalPoints, notes: adjustNotes });
      toast.success(`Successfully adjusted points balance`);
      setShowAdjustForm(false);
      setAdjustPoints("");
      setAdjustNotes("");
      await loadHistory();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to adjust points");
    } finally {
      setAdjusting(false);
    }
  };

  if (!customerId) return null;

  const customer = data?.customer;
  const history = data?.history || [];
  const tier = customer?.loyaltyTier;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-navy-100">
        {/* Header */}
        <div className="p-6 border-b border-navy-100/60 flex items-center justify-between bg-gradient-to-r from-gold-50/50 via-cream to-white">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gold-100/80 border border-gold-200/80 text-gold-700 flex items-center justify-center shadow-2xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-navy-900 flex items-center gap-2">
                {customer?.name || "Customer Loyalty Ledger"}
                {tier && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: tier.badge_color || "#b45309" }}
                  >
                    {tier.name} ({tier.multiplier}×)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Phone: <span className="font-semibold text-navy-900">{customer?.phone}</span> • Lifetime Spend: <span className="font-semibold text-navy-900">₹{Number(customer?.total_spend || 0).toLocaleString("en-IN")}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-navy-900 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Overview Card */}
        <div className="p-5 bg-slate-50/60 border-b border-navy-100/60 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Current Points Balance
            </span>
            <div className="text-3xl font-extrabold text-navy-900 mt-0.5 flex items-baseline gap-1.5">
              <span>{customer?.loyalty_points || 0}</span>
              <span className="text-sm font-semibold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-200">
                Points Available
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowAdjustForm(!showAdjustForm)}
            className="btn-premium-accent inline-flex items-center gap-2 !py-2 !px-4 text-xs font-bold shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showAdjustForm ? "Cancel Adjustment" : "Manual Adjustment"}
          </button>
        </div>

        {/* Manual Adjustment Form (Collapsible) */}
        {showAdjustForm && (
          <form onSubmit={handleAdjustSubmit} className="p-5 bg-white border-b border-navy-100 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-black uppercase tracking-wider text-navy-800">
              Adjust Customer Points Balance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="label-text">Action</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="premium-input text-xs font-bold"
                >
                  <option value="add">+ Add (Credit Points)</option>
                  <option value="subtract">- Subtract (Debit Points)</option>
                </select>
              </div>

              <div>
                <label className="label-text">Points Amount</label>
                <input
                  type="number"
                  min="1"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="50"
                  className="premium-input text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="label-text">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Birthday bonus / correction"
                  className="premium-input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={adjusting}
                className="btn-premium-primary !py-2 !px-4 text-xs font-bold"
              >
                {adjusting ? "Updating..." : "Save Adjustment"}
              </button>
            </div>
          </form>
        )}

        {/* Ledger Transaction History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-navy-800">
              Points History & Audit Ledger
            </h4>
            <span className="text-[11px] text-slate-400">
              {history.length} transactions recorded
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-10 text-gold-600">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              No point transactions recorded for this customer yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((item) => {
                const isPositive = item.points > 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 shadow-2xs hover:border-navy-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-navy-900 text-xs flex items-center gap-2">
                          <span className="capitalize">{item.type}</span>
                          {item.bill && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                              Bill #{item.bill.bill_number}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                          {item.tier_name && <span>• Tier: {item.tier_name}</span>}
                          {item.notes && <span>• {item.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div
                        className={`text-sm font-extrabold ${
                          isPositive ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {isPositive ? `+${item.points}` : item.points} Pts
                      </div>
                      <div className="text-[10px] text-slate-400">
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
