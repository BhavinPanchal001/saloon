import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  Tag,
  History,
  Coins,
  Hash,
  ArrowLeft,
  Ban,
  AlertTriangle,
  Wallet,
  PieChart,
  Calendar,
  Store,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  createExpense,
  fetchBudgetSummary,
  fetchOutlets,
} from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";

const initialExpenseForm = {
  itemName: "",
  qty: "",
  price: "",
  totalAmount: "",
  billNo: "",
};

export function ExpenseAddPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const userOutletId = user?.outlet_id;

  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(userOutletId);
  const [form, setForm] = useState(initialExpenseForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadOutlets();
      loadBudget();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBudget();
    }
  }, [selectedOutletId]);

  const loadBudget = async () => {
    setIsLoading(true);
    try {
      const budgetSummary = await fetchBudgetSummary({ outletId: selectedOutletId });
      setBudget(budgetSummary);
    } catch (err) {
      console.error("Failed to load budget:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOutlets = async () => {
    if (!isAdmin) return;
    try {
      const outletList = await fetchOutlets();
      setOutlets(outletList);
    } catch (err) {
      console.error("Failed to load outlets:", err);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      const next = { ...current, [name]: value };
      const qty = Number(name === "qty" ? value : current.qty);
      const price = Number(name === "price" ? value : current.price);
      next.totalAmount = qty > 0 && price > 0 ? String(qty * price) : "";
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.itemName || !form.totalAmount) return;

    setSubmitting(true);
    setError(null);

    try {
      await createExpense({
        ...form,
        outletId: selectedOutletId || userOutletId || "outlet_hsr",
      });

      navigate("/expenses");
    } catch (err) {
      setError(err.message || "Failed to create expense. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/expenses");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="Finance & Treasury"
        title="Add New Expense"
        description="Log a new expense entry for your outlet."
        action={
          isAdmin ? (
            <div className="flex items-center gap-2 bg-gold-50 border border-gold-200 rounded-xl px-4 py-3">
              <Store size={18} className="text-gold-600" />
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gold-700">Select Outlet</label>
                <select
                  value={selectedOutletId || ""}
                  onChange={(e) => setSelectedOutletId(e.target.value || null)}
                  className="bg-transparent font-semibold text-navy-900 text-sm min-w-[160px] outline-none cursor-pointer"
                >
                  <option value="">Choose an outlet...</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null
        }
      />

      {/* Budget Alert */}
      {budget && budget.spendPercentage >= 90 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-rose-900">Budget Alert</p>
            <p className="text-sm text-rose-700">
              {budget.spendPercentage >= 100
                ? `Budget exhausted! Remaining: ${formatCurrency(budget.remainingBalance)}.`
                : `Budget ${budget.spendPercentage}% utilized. Only ${formatCurrency(budget.remainingBalance)} remaining.`}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <Ban size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-rose-900">Error</p>
            <p className="text-sm text-rose-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-sm text-rose-600 hover:text-rose-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[400px_1fr]">
        {/* Entry Form */}
        <div className="space-y-6">
          <div className="glass-card">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
                <PlusCircle size={20} />
              </div>
              <h2 className="text-xl">Log New Entry</h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="premium-label flex items-center gap-2">
                  <Tag size={12} /> Item Name
                </label>
                <input
                  name="itemName"
                  placeholder="e.g. Premium Silk Towels"
                  className="premium-input"
                  value={form.itemName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="premium-label flex items-center gap-2">
                    <History size={12} /> Quantity
                  </label>
                  <input
                    name="qty"
                    type="number"
                    placeholder="0"
                    className="premium-input"
                    value={form.qty}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="premium-label flex items-center gap-2">
                    <Coins size={12} /> Unit Price
                  </label>
                  <input
                    name="price"
                    type="number"
                    placeholder="0.00"
                    className="premium-input"
                    value={form.price}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="premium-label">Estimated Total</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-5 text-navy-400 group-focus-within:text-navy-900 transition-colors">
                    <span className="text-sm font-bold">RM </span>
                  </div>
                  <input
                    name="totalAmount"
                    className="premium-input pl-14 font-bold text-navy-900 bg-navy-50/30"
                    value={form.totalAmount}
                    readOnly
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="premium-label flex items-center gap-2">
                  <Hash size={12} /> Reference / Bill No.
                </label>
                <input
                  name="billNo"
                  placeholder="e.g. BL-9902"
                  className="premium-input"
                  value={form.billNo}
                  onChange={handleChange}
                />
              </div>

              {/* Remaining Budget Info */}
              {budget && (
                <div className="p-4 rounded-xl bg-navy-50 border border-navy-100">
                  <p className="text-xs text-navy-500 uppercase font-bold mb-1">Remaining Budget</p>
                  <p className={`text-lg font-bold ${
                    budget.remainingBalance <= 0 ? "text-rose-600" :
                    budget.remainingBalance < budget.totalMonthlyBudget * 0.1 ? "text-amber-600" :
                    "text-emerald-600"
                  }`}>
                    {formatCurrency(budget.remainingBalance)}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-premium-outline flex-1"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (budget && budget.remainingBalance <= 0)}
                  className="btn-premium-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : budget?.remainingBalance <= 0 ? (
                    <span className="flex items-center gap-2">
                      <Ban size={16} />
                      Budget Exhausted
                    </span>
                  ) : (
                    "Save Expense"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Budget Summary Panel */}
        <div className="space-y-6">
          <div className="glass-card">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900">
                <Wallet size={20} />
              </div>
              <h2 className="text-xl">Budget Overview</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-navy-300 border-t-navy-600 rounded-full animate-spin" />
              </div>
            ) : budget ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gold-50 border border-gold-100">
                    <p className="text-xs text-gold-600 uppercase font-bold mb-1">Monthly Budget</p>
                    <p className="text-xl font-bold text-navy-900">{formatCurrency(budget.totalMonthlyBudget)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-navy-50 border border-navy-100">
                    <p className="text-xs text-navy-500 uppercase font-bold mb-1">Spent So Far</p>
                    <p className="text-xl font-bold text-navy-900">{formatCurrency(budget.totalExpensesSoFar)}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-emerald-600 uppercase font-bold">Available Balance</p>
                    <PieChart size={16} className="text-emerald-600" />
                  </div>
                  <p className={`text-2xl font-bold ${
                    budget.remainingBalance <= 0 ? "text-rose-600" :
                    budget.remainingBalance < budget.totalMonthlyBudget * 0.1 ? "text-amber-600" :
                    "text-emerald-600"
                  }`}>
                    {formatCurrency(budget.remainingBalance)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-navy-600">Budget Utilization</span>
                    <span className={`text-sm font-bold ${
                      budget.spendPercentage >= 90 ? "text-rose-500" :
                      budget.spendPercentage >= 75 ? "text-amber-500" : "text-navy-500"
                    }`}>
                      {Math.round(budget.spendPercentage)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        budget.spendPercentage >= 90 ? "bg-rose-500" :
                        budget.spendPercentage >= 75 ? "bg-amber-500" :
                        budget.spendPercentage >= 50 ? "bg-gold-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(budget.spendPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-navy-400">
                  <Calendar size={12} />
                  <span>Fiscal Month: {budget.monthKey || "April 2026"}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-navy-400">
                <p>No budget data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
