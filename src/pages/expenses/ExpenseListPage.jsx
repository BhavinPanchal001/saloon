import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  History,
  Trash2,
  PlusCircle,
  Wallet,
  ArrowUpRight,
  PieChart,
  Calendar,
  AlertTriangle,
  Ban,
  Store,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  fetchBudgetSummaryFromAPI,
  fetchExpensesFromAPI,
  deleteExpenseAPI,
  fetchOutletsFromAPI,
} from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";

export function ExpenseListPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const userOutletId = user?.outlet_id;

  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(userOutletId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [budgetSummary, expenseList] = await Promise.all([
        fetchBudgetSummaryFromAPI({ outletId: selectedOutletId }),
        fetchExpensesFromAPI({ outletId: selectedOutletId }),
      ]);

      setBudget(budgetSummary);
      setExpenses(expenseList);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      setError("Failed to load expenses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOutlets = async () => {
    if (!isAdmin) return;
    try {
      const outletList = await fetchOutletsFromAPI();
      setOutlets(outletList);
    } catch (err) {
      console.error("Failed to load outlets:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadOutlets();
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [selectedOutletId]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      await deleteExpenseAPI(id);
      loadData();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="Finance & Treasury"
        title="Expense Management"
        description="Monitor outlet expenses, budget runway, and spending history for real-time financial control."
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
                ? `Budget exhausted! Remaining: ${formatCurrency(budget.remainingBalance)}. No new expenses can be added until budget is increased.`
                : `Budget ${budget.spendPercentage}% utilized. Only ${formatCurrency(budget.remainingBalance)} remaining.`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate("/budgets")}
              className="btn-premium-outline text-sm !border-rose-300 !text-rose-700 hover:!bg-rose-100"
            >
              Increase Budget
            </button>
          )}
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

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="stat-card group">
          <div className="flex justify-between items-start">
            <div>
              <p className="premium-label">Total Monthly Budget</p>
              <h3 className="mt-2 text-3xl text-ink">
                {budget ? formatCurrency(budget.totalMonthlyBudget) : "--"}
              </h3>
            </div>
            <div className="rounded-2xl bg-gold-100 p-3 text-gold-600 transition-colors group-hover:bg-gold-500 group-hover:text-white">
              <Wallet size={24} />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-navy-400">
              <Calendar size={14} />
              <span>Fiscal Month: {budget?.monthKey || "April 2026"}</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate("/budgets")}
                className="text-[10px] font-black uppercase tracking-widest text-gold-600 hover:text-gold-700"
              >
                Set Budgets →
              </button>
            )}
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex justify-between items-start">
            <div>
              <p className="premium-label">Accrued Expenses</p>
              <h3 className="mt-2 text-3xl text-ink">
                {budget ? formatCurrency(budget.totalExpensesSoFar) : "--"}
              </h3>
            </div>
            <div className="rounded-2xl bg-navy-100 p-3 text-navy-600 transition-colors group-hover:bg-navy-500 group-hover:text-white">
              <ArrowUpRight size={24} />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-navy-50 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  budget?.spendPercentage >= 90 ? "bg-rose-500" :
                  budget?.spendPercentage >= 75 ? "bg-amber-500" :
                  budget?.spendPercentage >= 50 ? "bg-gold-500" : "bg-navy-500"
                }`}
                style={{ width: `${budget ? Math.min((budget.totalExpensesSoFar / budget.totalMonthlyBudget) * 100, 100) : 0}%` }}
              />
            </div>
            <span className={`text-[10px] font-black ${
              budget?.spendPercentage >= 90 ? "text-rose-500" :
              budget?.spendPercentage >= 75 ? "text-amber-500" : "text-navy-500"
            }`}>
              {budget ? Math.round((budget.totalExpensesSoFar / budget.totalMonthlyBudget) * 100) : 0}% used
            </span>
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex justify-between items-start">
            <div>
              <p className="premium-label">Available Balance</p>
              <h3 className="mt-2 text-3xl text-ink">
                {budget ? formatCurrency(budget.remainingBalance) : "--"}
              </h3>
            </div>
            <div className={`rounded-2xl p-3 transition-colors group-hover:text-white ${
              budget?.remainingBalance <= 0 ? "bg-rose-100 text-rose-600 group-hover:bg-rose-500" :
              budget?.remainingBalance < budget?.totalMonthlyBudget * 0.1 ? "bg-amber-100 text-amber-600 group-hover:bg-amber-500" :
              "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500"
            }`}>
              <PieChart size={24} />
            </div>
          </div>
          <div className={`mt-6 flex items-center gap-2 text-[10px] font-black uppercase ${
            budget?.remainingBalance <= 0 ? "text-rose-600" :
            budget?.remainingBalance < budget?.totalMonthlyBudget * 0.1 ? "text-amber-600" :
            "text-emerald-600"
          }`}>
            <div className={`h-2 w-2 rounded-full animate-pulse ${
              budget?.remainingBalance <= 0 ? "bg-rose-500" :
              budget?.remainingBalance < budget?.totalMonthlyBudget * 0.1 ? "bg-amber-500" :
              "bg-emerald-500"
            }`} />
            {budget?.remainingBalance <= 0 ? "Budget Exhausted" :
             budget?.remainingBalance < budget?.totalMonthlyBudget * 0.1 ? "Low Balance" :
             "Healthy Runway"}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/20">
            <Receipt size={20} />
          </div>
          <h2 className="text-xl">Spending History</h2>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-gold-50 border border-gold-200 rounded-xl px-4 py-2">
              <Store size={16} className="text-gold-600" />
              <select
                value={selectedOutletId || ""}
                onChange={(e) => setSelectedOutletId(e.target.value || null)}
                className="bg-transparent font-semibold text-navy-900 text-sm min-w-[160px] outline-none cursor-pointer"
              >
                <option value="">All Outlets</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => navigate("/expenses/add")}
            className="btn-premium-primary flex items-center gap-2"
            disabled={budget && budget.remainingBalance <= 0}
          >
            <PlusCircle size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Expense History Table */}
      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Item Details</th>
              <th className="text-center">Reference</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Net Amount</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-50">
                    <div className="w-8 h-8 border-2 border-navy-300 border-t-navy-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium">Loading expenses...</p>
                  </div>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <History size={48} />
                    <p className="text-sm font-medium">No expense records found for this cycle</p>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="group">
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-navy-900">{expense.itemName}</span>
                      <span className="text-[10px] text-navy-400">
                        {new Date(expense.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="status-badge bg-navy-50 text-navy-600 border border-navy-100/50">
                      {expense.billNo || "N/A"}
                    </span>
                  </td>
                  <td className="text-right font-medium text-navy-700">{expense.qty || "--"}</td>
                  <td className="text-right text-navy-600">{formatCurrency(expense.price)}</td>
                  <td className="text-right">
                    <span className="font-black text-navy-900">{formatCurrency(expense.totalAmount)}</span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="rounded-xl p-2.5 text-navy-300 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:scale-110"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
