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
      // Use current month consistently
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const [budgetSummary, expenseList] = await Promise.all([
        fetchBudgetSummaryFromAPI({ outletId: selectedOutletId, monthKey: currentMonthKey }),
        fetchExpensesFromAPI({ outletId: selectedOutletId, monthKey: currentMonthKey }),
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
      <div className="grid gap-2 grid-cols-1 md:grid-cols-3 mb-3">
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-gold-600" />
            <span className="text-xs text-navy-600 font-medium">Total Budget</span>
          </div>
          <span className="text-base font-bold text-navy-900">
            {budget ? formatCurrency(budget.totalMonthlyBudget) : "--"}
          </span>
        </div>

        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight className={`h-4 w-4 ${budget?.spendPercentage >= 90 ? "text-rose-500" : "text-navy-600"}`} />
            <span className="text-xs text-navy-600 font-medium">Accrued Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-navy-900">
              {budget ? formatCurrency(budget.totalExpensesSoFar) : "--"}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              budget?.spendPercentage >= 90 ? "bg-rose-100 text-rose-700" :
              budget?.spendPercentage >= 75 ? "bg-amber-100 text-amber-700" :
              "bg-navy-100 text-navy-700"
            }`}>
              {budget ? Math.round((budget.totalExpensesSoFar / budget.totalMonthlyBudget) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <PieChart className={`h-4 w-4 ${budget?.remainingBalance <= 0 ? "text-rose-500" : "text-emerald-600"}`} />
            <span className="text-xs text-navy-600 font-medium">Available Balance</span>
          </div>
          <span className={`text-base font-bold ${
            budget?.remainingBalance <= 0 ? "text-rose-600" :
            budget?.remainingBalance < budget?.totalMonthlyBudget * 0.1 ? "text-amber-600" :
            "text-emerald-600"
          }`}>
            {budget ? formatCurrency(budget.remainingBalance) : "--"}
          </span>
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
            onClick={() => navigate(selectedOutletId ? `/expenses/add?outletId=${selectedOutletId}` : "/expenses/add")}
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
              <th className="text-center">Payment</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-50">
                    <div className="w-8 h-8 border-2 border-navy-300 border-t-navy-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium">Loading expenses...</p>
                  </div>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
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
                  <td className="text-center">
                    {(() => {
                      const payments = expense.payments || [];
                      const paid = payments.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
                      const total = Number(expense.totalAmount || expense.total_amount || 0);
                      if (paid <= 0) {
                        return (
                          <span className="status-badge bg-slate-100 text-slate-500 border border-slate-200">
                            Unpaid
                          </span>
                        );
                      }
                      if (paid >= total) {
                        return (
                          <span className="status-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid
                          </span>
                        );
                      }
                      return (
                        <span className="status-badge bg-amber-50 text-amber-700 border border-amber-200">
                          Partial
                        </span>
                      );
                    })()}
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
