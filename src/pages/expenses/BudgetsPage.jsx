import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Calendar, History, Store, Plus, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  fetchBudgetSummaryFromAPI,
  updateMonthlyBudgetAPI,
  fetchAvailableMonthsFromAPI,
  fetchBudgetHistoryFromAPI,
  fetchOutletsFromAPI,
} from "../../services/api";
import { formatCurrency } from "../../utils/format";

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function BudgetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [budgetData, setBudgetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(searchParams.get("outletId") || "all");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAvailableMonths();
    loadBudgetHistory();
    loadOutlets();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadBudgets();
    }
  }, [selectedMonth, selectedOutlet]);

  useEffect(() => {
    loadBudgetHistory();
  }, [selectedOutlet, selectedMonth]);

  const loadAvailableMonths = async () => {
    try {
      const months = await fetchAvailableMonthsFromAPI();
      setAvailableMonths(months);
      if (!selectedMonth && months.length > 0) {
        setSelectedMonth(months[0]);
      }
    } catch (error) {
      console.error("Failed to load months:", error);
    }
  };

  const loadOutlets = async () => {
    try {
      const outletList = await fetchOutletsFromAPI();
      setOutlets(outletList);
    } catch (error) {
      console.error("Failed to load outlets:", error);
    }
  };

  const loadBudgets = async () => {
    if (!selectedMonth) return;
    setIsLoading(true);
    try {
      const outletId = selectedOutlet === "all" ? undefined : selectedOutlet;
      const summary = await fetchBudgetSummaryFromAPI({ monthKey: selectedMonth, outletId });
      setBudgetData(summary);
    } catch (error) {
      console.error("Failed to load budgets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutletChange = (outletId) => {
    setSelectedOutlet(outletId);
    if (outletId === "all") {
      searchParams.delete("outletId");
    } else {
      searchParams.set("outletId", outletId);
    }
    setSearchParams(searchParams);
  };

  const loadBudgetHistory = async () => {
    setHistoryLoading(true);
    try {
      const outletId = selectedOutlet === "all" ? undefined : selectedOutlet;
      const monthKey = selectedMonth || undefined;
      const history = await fetchBudgetHistoryFromAPI({ limit: 20, outletId, monthKey });
      setBudgetHistory(history);
    } catch (error) {
      console.error("Failed to load budget history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };


  const getProgressColor = (percentage) => {
    if (percentage >= 90) return "bg-rose-500";
    if (percentage >= 75) return "bg-amber-500";
    if (percentage >= 50) return "bg-gold-500";
    return "bg-emerald-500";
  };

  const selectedOutletData = selectedOutlet === "all"
    ? null
    : outlets.find(o => o.id === selectedOutlet);
  const selectedOutletName = selectedOutletData?.name;
  const selectedOutletBudget = budgetData?.budgets?.find(b => b.outletId === selectedOutlet)?.amount || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="Finance & Treasury"
        title={selectedOutletName ? `${selectedOutletName} Budget` : "Monthly Budgets"}
        description={selectedOutletName
          ? `View and manage budget for ${selectedOutletName}. Use the filter to see other outlets or all outlets.`
          : "Allocate and manage monthly expense budgets for all outlets across the network."}
        action={
          selectedOutlet !== "all" && (
            <button
              onClick={() => {
                setEditAmount(selectedOutletBudget || "");
                setEditReason("");
                setIsEditingBudget(true);
              }}
              className="btn-premium-primary"
            >
              <Plus size={18} />
              Allocate Budget
            </button>
          )
        }
      />

      {/* Month & Outlet Selector */}
      <div className="glass-card !p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
              <Calendar size={20} />
            </div>
            <div>
              <label className="premium-label block mb-2">Select Fiscal Month</label>
              <select
                value={selectedMonth || ""}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="premium-input !py-2.5 !w-auto min-w-[200px]"
                style={{ paddingRight: '4rem' }}
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
              <Store size={20} />
            </div>
            <div>
              <label className="premium-label block mb-2">Filter by Outlet</label>
              <select
                value={selectedOutlet}
                onChange={(e) => handleOutletChange(e.target.value)}
                className="premium-input !py-2.5 !w-auto min-w-[200px]"
                style={{ paddingRight: '4rem' }}
              >
                <option value="all">All Outlets</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Budget Edit Modal */}
      {isEditingBudget && selectedOutletData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl text-navy-900">Allocate Budget</h2>
              </div>
              <button
                type="button"
                className="btn-premium-outline !p-2 rounded-full"
                onClick={() => setIsEditingBudget(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="mt-8 space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editAmount || !selectedMonth) return;
                setSaving(true);
                try {
                  await updateMonthlyBudgetAPI({
                    outletId: selectedOutlet,
                    amount: Number(editAmount),
                    monthKey: selectedMonth,
                    reason: editReason || "Budget allocation"
                  });
                  await loadBudgets();
                  await loadBudgetHistory();
                  setIsEditingBudget(false);
                  setEditAmount("");
                  setEditReason("");
                } catch (error) {
                  console.error("Failed to update budget:", error);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div>
                <label className="premium-label">Outlet</label>
                <input
                  className="premium-input bg-slate-50"
                  value={selectedOutletName}
                  disabled
                />
              </div>
              <div>
                <label className="premium-label">Fiscal Month</label>
                <select
                  className="premium-input appearance-none"
                  value={selectedMonth || ""}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="premium-label">Budget Amount (RM)</label>
                <input
                  type="number"
                  min="0"
                  className="premium-input"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="Enter budget amount"
                  autoFocus
                />
              </div>
              <div>
                <label className="premium-label">Reason (Optional)</label>
                <input
                  type="text"
                  className="premium-input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g., Monthly allocation, Budget revision, Special event"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !editAmount}
                className="btn-premium-primary w-full disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  "Save Budget"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Budget Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Total Allocated</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">
            {isLoading ? "--" : formatCurrency(budgetData?.totalMonthlyBudget || 0)}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Total Spent</div>
          <div className="text-2xl font-bold mt-1 text-navy-600">
            {isLoading ? "--" : formatCurrency(budgetData?.totalExpensesSoFar || 0)}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Remaining</div>
          <div className="text-2xl font-bold mt-1 text-gold-600">
            {isLoading ? "--" : formatCurrency(budgetData?.remainingBalance || 0)}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Utilization</div>
          <div className="text-2xl font-bold mt-1 text-rose-600">
            {isLoading ? "--" : `${budgetData?.spendPercentage?.toFixed(0) || 0}%`}
          </div>
        </div>
      </div>

      {/* Budget History Section */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="px-5 py-4 border-b border-navy-100">
          <h2 className="text-xl font-bold text-navy-900">Budget History</h2>
          <p className="text-sm text-slate-500 mt-1">Track budget changes</p>
        </div>

        {historyLoading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-navy-100 border-t-navy-600 rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-sm text-slate-500">Loading...</p>
          </div>
        ) : budgetHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <History size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No budget changes recorded</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-navy-600 bg-slate-50">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-navy-600 bg-slate-50">Outlet</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-navy-600 bg-slate-50">Month</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-navy-600 bg-slate-50">Change</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-navy-600 bg-slate-50">New Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-navy-600 bg-slate-50">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetHistory.map((record) => (
                    <tr key={record.id} className="bg-white hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-navy-900">
                          {new Date(record.changedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-navy-400">
                          {new Date(record.changedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-navy-900">{record.outletName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-navy-600">{formatMonthLabel(record.monthKey)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className={`text-sm font-semibold ${
                          record.changeType === "increase" ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {record.changeType === "increase" ? "+" : "-"}
                          {formatCurrency(record.changeAmount)}
                        </div>
                        <div className="text-xs text-navy-400">
                          from {formatCurrency(record.previousAmount)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-navy-900">{formatCurrency(record.newAmount)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-500">{record.reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex justify-between items-center border-t border-navy-100">
              <div className="text-sm text-navy-500">
                Showing {budgetHistory.length} budget change{budgetHistory.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-2">
                <button className="btn-premium-outline !py-2 !px-4" disabled>Previous</button>
                <button className="btn-premium-outline !py-2 !px-4">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
