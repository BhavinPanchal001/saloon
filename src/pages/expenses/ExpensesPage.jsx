import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Receipt, 
  Wallet, 
  History, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  ArrowUpRight, 
  PieChart,
  Tag,
  Hash,
  Coins
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  createExpense,
  fetchBudgetSummary,
  fetchExpenses,
  deleteExpense,
  updateMonthlyBudget,
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

export function ExpensesPage({ scope }) {
  const user = useAuthStore((state) => state.user);
  const scopedOutletId =
    scope === "global" && user?.role === "admin" ? undefined : user?.outlet_id;

  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(initialExpenseForm);
  const [isLoading, setIsLoading] = useState(true);

  const loadExpensesPage = async () => {
    setIsLoading(true);
    try {
      const [budgetSummary, expenseList] = await Promise.all([
        fetchBudgetSummary({ outletId: scopedOutletId }),
        fetchExpenses({ outletId: scopedOutletId }),
      ]);

      setBudget(budgetSummary);
      setExpenses(expenseList);
    } catch (error) {
      console.error("Failed to load expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadExpensesPage();
    }
  }, [user, scope]);

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

    await createExpense({
      ...form,
      outletId: scopedOutletId || user?.outlet_id || "outlet_hsr",
    });

    setForm(initialExpenseForm);
    loadExpensesPage();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      await deleteExpense(id);
      loadExpensesPage();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="Finance & Treasury"
        title={scope === "global" ? "Expense Portfolio" : "Local Expense Control"}
        description="Monitor network-wide liquidity, budget runway, and granular expense logging for real-time spend management."
      />

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
              <span>Fiscal Month: April 2026</span>
            </div>
            {user?.role === "admin" && (
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
                className="h-full bg-navy-500 transition-all duration-1000" 
                style={{ width: `${budget ? Math.min((budget.totalExpensesSoFar / budget.totalMonthlyBudget) * 100, 100) : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-navy-500">
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
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
              <PieChart size={24} />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Healthy Runway
          </div>
        </div>
      </div>

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

              <button type="submit" className="btn-premium-primary w-full mt-2">
                Log Portfolio Expense
              </button>
            </form>

            {scope === "global" && user?.role === "admin" && (
              <div className="mt-8 rounded-2xl bg-gold-50/50 p-4 border border-gold-100">
                <p className="text-[10px] leading-relaxed text-gold-800/80 font-medium">
                  <strong className="text-gold-900 block mb-1">PRO-TIP: GLOBAL OVERVIEW</strong>
                  Entries made here in Admin mode are automatically attributed to the primary HSR flagship outlet for simulation purposes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Expense History Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/20">
                <Receipt size={20} />
              </div>
              <h2 className="text-xl">Spending History</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">
                Sorted by Recency
              </span>
            </div>
          </div>

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
                {expenses.length === 0 ? (
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
      </div>
      )}
    </div>
  );
}
