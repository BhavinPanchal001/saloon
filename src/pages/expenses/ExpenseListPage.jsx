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
  Pencil,
  X,
  CreditCard,
  Plus,
  ExternalLink,
  Coins,
  Tag,
  Hash,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import BankSelector from "../../modules/bank/components/BankSelector";
import {
  fetchBudgetSummaryFromAPI,
  fetchExpensesFromAPI,
  deleteExpenseAPI,
  updateExpenseAPI,
  fetchOutletsFromAPI,
} from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";

export function ExpenseListPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const userOutletId = user?.outlet_id;
  const toast = useToastStore();

  const canEdit =
    isAdmin ||
    user?.permissions?.includes("*") ||
    user?.permissions?.includes("expenses:edit") ||
    user?.permissions?.includes("expenses:create");
  const canDelete =
    isAdmin ||
    user?.permissions?.includes("*") ||
    user?.permissions?.includes("expenses:delete");

  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(userOutletId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const [editForm, setEditForm] = useState({
    itemName: "",
    qty: "",
    price: "",
    totalAmount: "",
    billNo: "",
    outletId: "",
  });

  const [editEnablePayment, setEditEnablePayment] = useState(false);
  const [editPaymentDetails, setEditPaymentDetails] = useState([{ paymentMode: "cash", amount: "" }]);
  const [editTransactionReference, setEditTransactionReference] = useState("");
  const [editPaymentNotes, setEditPaymentNotes] = useState("");
  const [editBankAccountId, setEditBankAccountId] = useState("");

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
      try {
        await deleteExpenseAPI(id);
        toast.success("Expense deleted successfully");
        loadData();
      } catch (err) {
        console.error("Failed to delete expense:", err);
        toast.error(err.message || "Failed to delete expense.");
      }
    }
  };

  const handleOpenEditModal = (expense) => {
    setEditingExpense(expense);
    setEditError(null);
    setEditForm({
      itemName: expense.itemName || "",
      qty: expense.qty !== null && expense.qty !== undefined ? String(expense.qty) : "",
      price: expense.price !== null && expense.price !== undefined ? String(expense.price) : "",
      totalAmount: expense.totalAmount !== null && expense.totalAmount !== undefined ? String(expense.totalAmount) : "",
      billNo: expense.billNo || "",
      outletId: expense.outletId ? String(expense.outletId) : (selectedOutletId || userOutletId || ""),
    });

    if (expense.payments && expense.payments.length > 0) {
      const primaryPayment = expense.payments[0];
      setEditEnablePayment(true);
      if (primaryPayment.details && primaryPayment.details.length > 0) {
        setEditPaymentDetails(
          primaryPayment.details.map((d) => ({
            paymentMode: d.paymentMode,
            amount: String(d.amount),
          }))
        );
      } else if (Number(primaryPayment.totalAmount) > 0) {
        setEditPaymentDetails([{ paymentMode: "cash", amount: String(primaryPayment.totalAmount) }]);
      }
      setEditTransactionReference(primaryPayment.transactionReference || "");
      setEditPaymentNotes(primaryPayment.notes || "");
      setEditBankAccountId(primaryPayment.bankAccountId ? String(primaryPayment.bankAccountId) : "");
    } else {
      setEditEnablePayment(false);
      setEditPaymentDetails([{ paymentMode: "cash", amount: "" }]);
      setEditTransactionReference("");
      setEditPaymentNotes("");
      setEditBankAccountId("");
    }

    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingExpense(null);
    setEditError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "qty" || name === "price") {
        const qty = Number(name === "qty" ? value : current.qty);
        const price = Number(name === "price" ? value : current.price);
        if (qty > 0 && price > 0) {
          next.totalAmount = String(qty * price);
        }
      }
      return next;
    });
  };

  const addEditPaymentMethod = () => {
    setEditPaymentDetails((prev) => [...prev, { paymentMode: "cash", amount: "" }]);
  };

  const removeEditPaymentMethod = (index) => {
    setEditPaymentDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEditPaymentDetail = (index, field, value) => {
    setEditPaymentDetails((prev) =>
      prev.map((detail, i) => (i === index ? { ...detail, [field]: value } : detail))
    );
  };

  const editTotalPayment = editPaymentDetails.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const editGrandTotal = Number(editForm.totalAmount) || 0;
  const editPaymentBalance = editGrandTotal - editTotalPayment;

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.itemName.trim()) {
      setEditError("Item name is required.");
      return;
    }
    if (!editForm.price || Number(editForm.price) <= 0) {
      setEditError("Price must be greater than 0.");
      return;
    }
    if (!editForm.totalAmount || Number(editForm.totalAmount) <= 0) {
      setEditError("Total amount must be greater than 0.");
      return;
    }

    if (editEnablePayment && editTotalPayment > editGrandTotal) {
      setEditError(`Payment total (${editTotalPayment.toFixed(2)}) cannot exceed expense total (${editGrandTotal.toFixed(2)}).`);
      return;
    }

    if (editEnablePayment) {
      const hasBank = editPaymentDetails.some(
        (d) => (d.paymentMode === "bank_transfer" || d.paymentMode === "cheque") && Number(d.amount) > 0
      );
      if (hasBank && !editBankAccountId.trim()) {
        setEditError("Bank account selection is required for bank transfer or cheque payments.");
        return;
      }
    }

    setEditSubmitting(true);
    setEditError(null);

    const payment = editEnablePayment
      ? {
          status: "completed",
          transactionReference: editTransactionReference.trim(),
          notes: editPaymentNotes.trim(),
          paymentDate: new Date().toISOString().split("T")[0],
          bankAccountId: editBankAccountId.trim() || null,
          details: editPaymentDetails
            .filter((d) => Number(d.amount) > 0)
            .map((d) => ({
              paymentMode: d.paymentMode,
              amount: Number(d.amount),
            })),
        }
      : null;

    try {
      await updateExpenseAPI(editingExpense.id, {
        itemName: editForm.itemName.trim(),
        qty: editForm.qty ? Number(editForm.qty) : null,
        price: Number(editForm.price),
        totalAmount: Number(editForm.totalAmount),
        billNo: editForm.billNo.trim() || null,
        outletId: editForm.outletId || editingExpense.outletId,
        monthKey: editingExpense.monthKey,
        payment,
      });

      toast.success("Expense updated successfully!");
      handleCloseEditModal();
      loadData();
    } catch (err) {
      console.error("Failed to update expense:", err);
      setEditError(err.message || "Failed to update expense.");
    } finally {
      setEditSubmitting(false);
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
              <th className="w-24 text-right">Actions</th>
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
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(expense)}
                          title="Edit Expense"
                          className="rounded-xl p-2.5 text-navy-400 transition-all hover:bg-gold-50 hover:text-gold-600 group-hover:scale-105"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(expense.id)}
                          title="Delete Expense"
                          className="rounded-xl p-2.5 text-navy-300 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:scale-105"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Edit Expense Modal ── */}
      {isEditModalOpen && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gold-500/20 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-navy-100/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900 shadow-md">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy-900">Edit Expense</h3>
                  <p className="text-xs text-navy-400">
                    ID: #{editingExpense.id} • Registered {new Date(editingExpense.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCloseEditModal();
                    navigate(`/expenses/edit/${editingExpense.id}`);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-navy-600 hover:text-gold-600 bg-navy-50 hover:bg-gold-50 px-3 py-1.5 rounded-lg transition-colors"
                  title="Open in full page editor"
                >
                  <ExternalLink size={14} /> Full Page
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="rounded-xl p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Error in modal */}
            {editError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-center gap-3">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <p className="text-xs text-rose-700 font-medium flex-1">{editError}</p>
                <button
                  type="button"
                  onClick={() => setEditError(null)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="premium-label flex items-center gap-2">
                  <Tag size={12} /> Item Name
                </label>
                <input
                  type="text"
                  name="itemName"
                  value={editForm.itemName}
                  onChange={handleEditFormChange}
                  placeholder="e.g. Premium Hair Styling Clay"
                  className="premium-input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="premium-label flex items-center gap-2">
                    <Hash size={12} /> Reference / Bill No.
                  </label>
                  <input
                    type="text"
                    name="billNo"
                    value={editForm.billNo}
                    onChange={handleEditFormChange}
                    placeholder="e.g. BL-9902"
                    className="premium-input w-full"
                  />
                </div>

                {isAdmin && (
                  <div className="space-y-1.5">
                    <label className="premium-label flex items-center gap-2">
                      <Store size={12} /> Outlet
                    </label>
                    <select
                      name="outletId"
                      value={editForm.outletId}
                      onChange={handleEditFormChange}
                      className="premium-input w-full cursor-pointer"
                    >
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="premium-label flex items-center gap-2">
                    <History size={12} /> Quantity
                  </label>
                  <input
                    type="number"
                    name="qty"
                    min="0"
                    step="any"
                    value={editForm.qty}
                    onChange={handleEditFormChange}
                    placeholder="0"
                    className="premium-input w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="premium-label flex items-center gap-2">
                    <Coins size={12} /> Unit Price (RM)
                  </label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={handleEditFormChange}
                    placeholder="0.00"
                    className="premium-input w-full"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="premium-label flex items-center gap-2">
                    Net Total (RM)
                  </label>
                  <input
                    type="number"
                    name="totalAmount"
                    min="0"
                    step="0.01"
                    value={editForm.totalAmount}
                    onChange={handleEditFormChange}
                    placeholder="0.00"
                    className="premium-input w-full font-bold text-navy-900 bg-gold-50/40"
                    required
                  />
                </div>
              </div>

              {/* ── Payment Details Section ── */}
              <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editEnablePayment}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditEnablePayment(checked);
                        if (!checked) {
                          setEditPaymentDetails([{ paymentMode: "cash", amount: "" }]);
                        } else if (editPaymentDetails.length === 0 || !editPaymentDetails[0].amount) {
                          setEditPaymentDetails([{ paymentMode: "cash", amount: editForm.totalAmount || "" }]);
                        }
                      }}
                      className="h-4 w-4 accent-gold-500 rounded cursor-pointer"
                    />
                    <span className="text-sm font-bold text-navy-900 flex items-center gap-2">
                      <CreditCard size={16} className="text-gold-600" />
                      Record / Update Payment Details
                    </span>
                  </label>

                  {editEnablePayment && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editPaymentDetails.length === 1) {
                          setEditPaymentDetails([{ ...editPaymentDetails[0], amount: editForm.totalAmount }]);
                        }
                      }}
                      className="text-[11px] font-bold text-gold-700 hover:text-gold-900 underline"
                    >
                      Match Total Amount
                    </button>
                  )}
                </div>

                {editEnablePayment && (
                  <div className="space-y-3 pt-2">
                    {editPaymentDetails.map((detail, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                        <select
                          value={detail.paymentMode}
                          onChange={(e) => updateEditPaymentDetail(index, "paymentMode", e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white font-semibold text-navy-800 focus:outline-none"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                        </select>
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 bg-slate-50 flex-1">
                          <span className="text-xs font-bold text-slate-400">RM</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={detail.amount}
                            onChange={(e) => updateEditPaymentDetail(index, "amount", e.target.value)}
                            placeholder="0.00"
                            className="w-full text-xs font-bold text-navy-900 bg-transparent focus:outline-none"
                          />
                        </div>
                        {editPaymentDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEditPaymentMethod(index)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addEditPaymentMethod}
                      className="text-xs text-gold-600 hover:text-gold-700 font-bold flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Payment Method
                    </button>

                    {editTotalPayment > 0 && (
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                          editPaymentBalance === 0
                            ? "bg-emerald-100 text-emerald-800"
                            : editPaymentBalance > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {editPaymentBalance === 0
                            ? "Fully Covered"
                            : editPaymentBalance > 0
                            ? `Due: RM ${editPaymentBalance.toFixed(2)}`
                            : `Overpaid: RM ${Math.abs(editPaymentBalance).toFixed(2)}`}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-navy-500">
                          Transaction Ref
                        </label>
                        <input
                          type="text"
                          value={editTransactionReference}
                          onChange={(e) => setEditTransactionReference(e.target.value)}
                          placeholder="e.g. TXN12345"
                          className="premium-input w-full !py-1.5 !text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-navy-500">
                          Payment Remarks
                        </label>
                        <input
                          type="text"
                          value={editPaymentNotes}
                          onChange={(e) => setEditPaymentNotes(e.target.value)}
                          placeholder="Any remarks..."
                          className="premium-input w-full !py-1.5 !text-xs"
                        />
                      </div>
                    </div>

                    <BankSelector
                      value={editBankAccountId}
                      onChange={setEditBankAccountId}
                      label="Bank Account (for Bank Transfer & Cheque)"
                      placeholder="Select bank account"
                      showDefaultIndicator={true}
                      className="text-xs pt-1"
                    />
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-100/60">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="btn-premium-outline !py-2.5 !px-5 text-sm"
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-premium-primary !py-2.5 !px-6 text-sm flex items-center gap-2"
                >
                  {editSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
