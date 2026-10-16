import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Calendar, History, Store, Plus, X, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  fetchBudgetSummaryFromAPI,
  updateMonthlyBudgetAPI,
  deleteBudgetAPI,
  deleteBudgetHistoryAPI,
  updateBudgetHistoryAPI,
  fetchAvailableMonthsFromAPI,
  fetchBudgetHistoryFromAPI,
  fetchOutletsFromAPI,
} from "../../services/api";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";

function formatMonthLabel(monthKey) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function BudgetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToastStore();

  const [budgetData, setBudgetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(searchParams.get("outletId") || "all");

  // Edit / Allocate modal state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [modalOutletId, setModalOutletId] = useState("");
  const [modalMonthKey, setModalMonthKey] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const hasCurrentMonth = months.includes(currentMonthKey);
        setSelectedMonth(hasCurrentMonth ? currentMonthKey : months[0]);
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
      const history = await fetchBudgetHistoryFromAPI({ limit: 50, outletId, monthKey });
      setBudgetHistory(history);
    } catch (error) {
      console.error("Failed to load budget history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const selectedOutletData = selectedOutlet === "all"
    ? null
    : outlets.find(o => String(o.id) === String(selectedOutlet));
  const selectedOutletName = selectedOutletData?.name;
  const selectedOutletBudget = budgetData?.budgets?.find(b => String(b.outletId) === String(selectedOutlet))?.amount || 0;

  // Modal Handlers
  const handleOpenAllocateBudget = () => {
    setEditingHistoryId(null);
    setModalOutletId(selectedOutlet === "all" ? (outlets[0]?.id || "") : selectedOutlet);
    setModalMonthKey(selectedMonth || (availableMonths[0] || ""));
    setEditAmount("");
    setEditReason("");
    setIsEditingBudget(true);
  };

  const handleOpenEditBudget = () => {
    setEditingHistoryId(null);
    setModalOutletId(selectedOutlet);
    setModalMonthKey(selectedMonth);
    setEditAmount(selectedOutletBudget || "");
    setEditReason("");
    setIsEditingBudget(true);
  };

  const handleOpenDeleteBudget = () => {
    setDeleteTarget({
      type: "budget",
      outletId: selectedOutlet,
      outletName: selectedOutletName,
      monthKey: selectedMonth,
      amount: selectedOutletBudget,
    });
    setDeleteConfirmOpen(true);
  };

  const handleEditFromRow = (record) => {
    setEditingHistoryId(record.id);
    setModalOutletId(record.outletId);
    setModalMonthKey(record.monthKey);
    setEditAmount(record.newAmount);
    setEditReason(record.reason || "");
    setIsEditingBudget(true);
  };

  const handleDeleteFromRow = (record) => {
    setDeleteTarget({
      type: "history",
      historyId: record.id,
      outletId: record.outletId,
      outletName: record.outletName,
      monthKey: record.monthKey,
      amount: record.newAmount,
      changeAmount: record.changeAmount,
      changeType: record.changeType,
    });
    setDeleteConfirmOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!editAmount || !modalOutletId || !modalMonthKey) return;
    setSaving(true);
    try {
      if (editingHistoryId) {
        await updateBudgetHistoryAPI(editingHistoryId, {
          newAmount: Number(editAmount),
          reason: editReason || "Budget revision",
        });
        toast.success("Budget entry updated successfully!");
      } else {
        await updateMonthlyBudgetAPI({
          outletId: modalOutletId,
          amount: Number(editAmount),
          monthKey: modalMonthKey,
          reason: editReason || (Number(selectedOutletBudget) > 0 ? "Budget revised" : "Budget allocation"),
        });
        toast.success(Number(selectedOutletBudget) > 0 ? "Budget updated successfully!" : "Budget allocated successfully!");
      }
      await Promise.all([loadBudgets(), loadBudgetHistory()]);
      setIsEditingBudget(false);
      setEditingHistoryId(null);
      setEditAmount("");
      setEditReason("");
    } catch (error) {
      console.error("Failed to save budget:", error);
      toast.error(error.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "budget") {
        await deleteBudgetAPI({
          outletId: deleteTarget.outletId,
          monthKey: deleteTarget.monthKey,
          reason: "Budget deleted by admin",
        });
        toast.success(`Budget for ${deleteTarget.outletName} deleted successfully!`);
      } else if (deleteTarget.type === "history") {
        await deleteBudgetHistoryAPI(deleteTarget.historyId);
        toast.success("Budget change record deleted successfully!");
      }
      await Promise.all([loadBudgets(), loadBudgetHistory()]);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      setIsEditingBudget(false);
    } catch (error) {
      console.error("Failed to delete budget:", error);
      toast.error(error.message || "Failed to delete budget");
    } finally {
      setIsDeleting(false);
    }
  };

  const modalOutletName = outlets.find(o => String(o.id) === String(modalOutletId))?.name || selectedOutletName;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="Finance & Treasury"
        title={selectedOutletName ? `${selectedOutletName} Budget` : "Monthly Budgets"}
        description={selectedOutletName
          ? `View and manage budget for ${selectedOutletName}. Use the filter to see other outlets or all outlets.`
          : "Allocate and manage monthly expense budgets for all outlets across the network."}
        action={
          <div className="flex items-center gap-3">
            {selectedOutlet !== "all" && Number(selectedOutletBudget) > 0 ? (
              <>
                <button
                  onClick={handleOpenEditBudget}
                  className="btn-premium-primary flex items-center gap-2"
                >
                  <Pencil size={17} />
                  Edit Budget
                </button>
                <button
                  onClick={handleOpenDeleteBudget}
                  className="btn-premium-outline !border-rose-300 !text-rose-600 hover:!bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 size={17} />
                  Delete Budget
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenAllocateBudget}
                className="btn-premium-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Allocate Budget
              </button>
            )}
          </div>
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

      {/* Budget Summary Cards */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 mb-3">
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Total Allocated</span>
          <span className="text-base font-bold text-emerald-600">
            {isLoading ? "--" : formatCurrency(budgetData?.totalMonthlyBudget || 0)}
          </span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Total Spent</span>
          <span className="text-base font-bold text-navy-900">
            {isLoading ? "--" : formatCurrency(budgetData?.totalExpensesSoFar || 0)}
          </span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Remaining</span>
          <span className="text-base font-bold text-gold-600">
            {isLoading ? "--" : formatCurrency(budgetData?.remainingBalance || 0)}
          </span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Utilization</span>
          <span className="text-base font-bold text-rose-600">
            {isLoading ? "--" : `${budgetData?.spendPercentage?.toFixed(0) || 0}%`}
          </span>
        </div>
      </div>

      {/* Budget Edit / Allocate Modal */}
      {isEditingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card-solid w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-navy-900">
                  {editingHistoryId
                    ? "Edit Budget Allocation"
                    : Number(selectedOutletBudget) > 0 && selectedOutlet !== "all"
                    ? "Edit Budget"
                    : "Allocate Budget"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingHistoryId
                    ? "Modify this recorded budget allocation"
                    : "Set monthly budget limit for expenses"}
                </p>
              </div>
              <button
                type="button"
                className="btn-premium-outline !p-2 rounded-full flex-shrink-0"
                onClick={() => {
                  setIsEditingBudget(false);
                  setEditingHistoryId(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 mt-4 custom-scrollbar">
              <form className="space-y-4 pb-2" onSubmit={handleSaveBudget}>
                <div>
                  <label className="premium-label">Outlet</label>
                  {selectedOutlet !== "all" || editingHistoryId ? (
                    <input
                      className="premium-input bg-slate-50 text-slate-700 font-medium"
                      value={modalOutletName || ""}
                      disabled
                    />
                  ) : (
                    <select
                      className="premium-input"
                      value={modalOutletId}
                      onChange={(e) => setModalOutletId(e.target.value)}
                      required
                    >
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="premium-label">Fiscal Month</label>
                  {editingHistoryId ? (
                    <input
                      className="premium-input bg-slate-50 text-slate-700"
                      value={formatMonthLabel(modalMonthKey)}
                      disabled
                    />
                  ) : (
                    <select
                      className="premium-input appearance-none"
                      value={modalMonthKey || ""}
                      onChange={(e) => setModalMonthKey(e.target.value)}
                      required
                    >
                      {availableMonths.map((month) => (
                        <option key={month} value={month}>
                          {formatMonthLabel(month)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="premium-label">Budget Amount (RM)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="premium-input text-lg font-semibold"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="Enter budget amount"
                    autoFocus
                    required
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

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  {!editingHistoryId && selectedOutlet !== "all" && Number(selectedOutletBudget) > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBudget(false);
                        handleOpenDeleteBudget();
                      }}
                      className="btn-premium-outline !border-rose-200 !text-rose-600 hover:!bg-rose-50 flex items-center gap-1.5 text-sm"
                    >
                      <Trash2 size={16} />
                      Delete Budget
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBudget(false);
                        setEditingHistoryId(null);
                      }}
                      className="btn-premium-outline text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !editAmount}
                      className="btn-premium-primary text-sm disabled:opacity-50 min-w-[120px]"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : (
                        editingHistoryId || (selectedOutlet !== "all" && Number(selectedOutletBudget) > 0)
                          ? "Update Budget"
                          : "Save Budget"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card-solid w-full max-w-md p-6 space-y-5 border border-rose-100 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-navy-900">
                  {deleteTarget.type === "budget" ? "Delete Budget" : "Delete Budget Record"}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {deleteTarget.type === "budget" ? (
                    <>
                      Are you sure you want to delete the budget of{" "}
                      <strong className="text-navy-900 font-semibold">{formatCurrency(deleteTarget.amount)}</strong> for{" "}
                      <strong className="text-navy-900 font-semibold">{deleteTarget.outletName}</strong> (
                      {formatMonthLabel(deleteTarget.monthKey)})? This will remove the allocated budget and reset it to RM 0.00.
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete this budget change record for{" "}
                      <strong className="text-navy-900 font-semibold">{deleteTarget.outletName}</strong> (
                      <span className={deleteTarget.changeType === "increase" ? "text-emerald-600" : "text-rose-600"}>
                        {deleteTarget.changeType === "increase" ? "+" : "-"}
                        {formatCurrency(deleteTarget.changeAmount)}
                      </span>
                      )? If this was the latest change, the monthly budget will revert to its previous amount.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteTarget(null);
                }}
                disabled={isDeleting}
                className="btn-premium-outline !py-2.5 !px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="btn-premium-primary !bg-rose-600 hover:!bg-rose-700 !border-rose-600 !py-2.5 !px-4 text-sm text-white disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget History Section */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="px-5 py-4 border-b border-navy-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy-900">Budget History</h2>
            <p className="text-sm text-slate-500 mt-1">Track budget changes</p>
          </div>
          {budgetHistory.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy-50 text-navy-700 border border-navy-100">
              {budgetHistory.length} record{budgetHistory.length !== 1 ? 's' : ''}
            </span>
          )}
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
                    <th className="text-right py-3 px-4 text-sm font-semibold text-navy-600 bg-slate-50">Actions</th>
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
                        <span className="text-sm text-slate-500">{record.reason || "Budget allocation"}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditFromRow(record)}
                            title="Edit Budget / Allocation"
                            className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFromRow(record)}
                            title="Delete Record"
                            className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
