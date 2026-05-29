import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Package,
  PencilLine,
  ChevronDown,
  Search,
  X,
  ArrowUpRight,
  CreditCard,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import BankSelector from "../../modules/bank/components/BankSelector";
import {
  createExpenseAPI,
  fetchBudgetSummaryFromAPI,
  fetchOutletsFromAPI,
  fetchOutletInventoryFromAPI,
  fetchAvailableMonthsFromAPI,
} from "../../services/api";
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
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const userOutletId = user?.outlet_id;

  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(userOutletId);
  const [form, setForm] = useState(initialExpenseForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeMonthKey, setActiveMonthKey] = useState(null);
  const [enablePayment, setEnablePayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState([{ paymentMode: "cash", amount: "" }]);
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  // ── Item name: inventory vs custom ────────────────────────────────────────
  const [itemMode, setItemMode] = useState("inventory"); // "inventory" | "custom"
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadOutlets();
      loadBudget();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBudget();
      loadInventory();
    }
  }, [selectedOutletId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadInventory = async () => {
    try {
      const outletId = selectedOutletId || userOutletId;
      if (!outletId) return;
      const items = await fetchOutletInventoryFromAPI({ outletId });
      setInventoryItems(items);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
  };

  const loadBudget = async () => {
    setIsLoading(true);
    try {
      const outletId = selectedOutletId || userOutletId;

      // Use current month by default
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setActiveMonthKey(currentMonthKey);
      
      const budgetSummary = await fetchBudgetSummaryFromAPI({
        outletId,
        monthKey: currentMonthKey,
      });
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
      const outletList = await fetchOutletsFromAPI();
      setOutlets(outletList);
      // Select first outlet by default if no outlet is currently selected
      if (outletList.length > 0 && !selectedOutletId) {
        setSelectedOutletId(outletList[0].id);
      }
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

  const handleSelectInventoryItem = (item) => {
    setForm((current) => ({
      ...current,
      itemName: item.itemName,
    }));
    setItemSearch(item.itemName);
    setShowDropdown(false);
  };

  const handleSwitchMode = (mode) => {
    setItemMode(mode);
    setForm((current) => ({ ...current, itemName: "" }));
    setItemSearch("");
    setShowDropdown(false);
  };

  const filteredInventory = inventoryItems.filter((item) =>
    item.itemName.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const addPaymentMethod = () => {
    setPaymentDetails((prev) => [...prev, { paymentMode: "cash", amount: "" }]);
  };

  const removePaymentMethod = (index) => {
    setPaymentDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePaymentDetail = (index, field, value) => {
    setPaymentDetails((prev) =>
      prev.map((detail, i) => (i === index ? { ...detail, [field]: value } : detail))
    );
  };

  const totalPaymentAmount = paymentDetails.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const grandTotal = Number(form.totalAmount) || 0;
  const paymentBalance = grandTotal - totalPaymentAmount;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.itemName || !form.totalAmount) return;

    if (enablePayment && totalPaymentAmount > grandTotal) {
      setError(`Payment amount (${totalPaymentAmount.toFixed(2)}) cannot exceed the expense total (${grandTotal.toFixed(2)}).`);
      return;
    }

    if (enablePayment) {
      const hasBankTransferOrCheque = paymentDetails.some(
        (d) => (d.paymentMode === "bank_transfer" || d.paymentMode === "cheque") && Number(d.amount) > 0
      );
      if (hasBankTransferOrCheque && !bankAccountId.trim()) {
        setError("Bank account selection is required for bank transfer and cheque payments.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const payment = enablePayment
      ? {
          status: "completed",
          transactionReference: transactionReference.trim(),
          notes: paymentNotes.trim(),
          paymentDate: new Date().toISOString().split("T")[0],
          bankAccountId: bankAccountId.trim() || null,
          details: paymentDetails
            .filter((d) => Number(d.amount) > 0)
            .map((d) => ({
              paymentMode: d.paymentMode,
              amount: Number(d.amount),
            })),
        }
      : null;

    try {
      await createExpenseAPI({
        ...form,
        outletId: selectedOutletId || userOutletId,
        ...(activeMonthKey ? { monthKey: activeMonthKey } : {}),
        payment,
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

      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
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
              {/* ── Item Name ── */}
              <div className="space-y-1.5">
                <label className="premium-label flex items-center gap-2">
                  <Tag size={12} /> Item Name
                </label>

                {/* Mode toggle */}
                <div className="flex rounded-lg border border-navy-200 overflow-hidden text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("inventory")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                      itemMode === "inventory"
                        ? "bg-navy-900 text-white"
                        : "bg-white text-navy-500 hover:bg-navy-50"
                    }`}
                  >
                    <Package size={11} /> From Inventory
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("custom")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                      itemMode === "custom"
                        ? "bg-navy-900 text-white"
                        : "bg-white text-navy-500 hover:bg-navy-50"
                    }`}
                  >
                    <PencilLine size={11} /> Custom Item
                  </button>
                </div>

                {/* Inventory picker */}
                {itemMode === "inventory" ? (
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-navy-400">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search inventory..."
                        className="premium-input pl-9 pr-8"
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value);
                          setShowDropdown(true);
                          if (!e.target.value) {
                            setForm((c) => ({ ...c, itemName: "" }));
                          }
                        }}
                        onFocus={() => setShowDropdown(true)}
                        required={itemMode === "inventory"}
                      />
                      {itemSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setItemSearch("");
                            setForm((c) => ({ ...c, itemName: "" }));
                          }}
                          className="absolute inset-y-0 right-3 flex items-center text-navy-400 hover:text-navy-700"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {showDropdown && (
                      <div className="absolute z-30 mt-1 w-full rounded-xl border border-navy-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                        {filteredInventory.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-navy-400 text-center">
                            No matching inventory items
                          </div>
                        ) : (
                          filteredInventory.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectInventoryItem(item)}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-navy-50 text-left transition-colors"
                            >
                              <span className="text-sm font-medium text-navy-900">{item.itemName}</span>
                              <span className="text-xs text-navy-400 ml-2">Stock: {item.currentStock}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {form.itemName && (
                      <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <Package size={10} /> Selected: {form.itemName}
                      </p>
                    )}
                  </div>
                ) : (
                  /* Custom free-text input */
                  <input
                    name="itemName"
                    placeholder="e.g. Premium Silk Towels"
                    className="premium-input"
                    value={form.itemName}
                    onChange={handleChange}
                    required
                  />
                )}
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
                  disabled={submitting || (budget && budget.totalMonthlyBudget > 0 && budget.remainingBalance <= 0)}
                  className="btn-premium-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (budget?.totalMonthlyBudget > 0 && budget?.remainingBalance <= 0) ? (
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

          {/* Payment Section */}
          <div className="glass-card">
            <label className="flex items-center gap-3 cursor-pointer mb-0">
              <input
                type="checkbox"
                checked={enablePayment}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEnablePayment(checked);
                  if (!checked) {
                    setPaymentDetails([{ paymentMode: "cash", amount: "" }]);
                    setBankAccountId("");
                    setTransactionReference("");
                    setPaymentNotes("");
                  }
                }}
                className="h-4 w-4 accent-gold-500"
              />
              <span className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gold-500" />
                Add Payment Now
              </span>
            </label>

            {enablePayment && (
              <div className="mt-5 space-y-3">
                {paymentDetails.map((detail, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={detail.paymentMode}
                        onChange={(e) => updatePaymentDetail(index, "paymentMode", e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white font-medium text-navy-700 focus:outline-none focus:border-navy-400"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 w-36">
                        <span className="text-slate-400 text-sm font-semibold shrink-0">RM</span>
                        <input
                          type="number"
                          min="0"
                          value={detail.amount || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const otherTotal = paymentDetails.reduce(
                              (s, d, i) => (i === index ? s : s + (Number(d.amount) || 0)),
                              0
                            );
                            const capped = Math.min(val, grandTotal - otherTotal);
                            updatePaymentDetail(index, "amount", capped >= 0 ? capped : 0);
                          }}
                          placeholder="0.00"
                          className="w-full text-sm font-semibold text-navy-700 bg-transparent focus:outline-none"
                        />
                      </div>
                      {paymentDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentMethod(index)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPaymentMethod}
                  className="text-sm text-gold-600 hover:text-gold-700 font-semibold flex items-center gap-1.5 px-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Payment Method
                </button>

                {totalPaymentAmount > 0 && (
                  <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest ${
                    paymentBalance === 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : paymentBalance > 0
                      ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : "bg-rose-50 text-rose-600 border border-rose-200"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      paymentBalance === 0 ? "bg-emerald-500" : paymentBalance > 0 ? "bg-amber-500" : "bg-rose-500"
                    }`} />
                    {paymentBalance === 0
                      ? "Fully Covered"
                      : paymentBalance > 0
                      ? `Due: RM ${paymentBalance.toFixed(2)}`
                      : `Overpaid: RM ${Math.abs(paymentBalance).toFixed(2)}`}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  <div className="space-y-1.5">
                    <label className="premium-label flex items-center gap-1.5">
                      Transaction Ref <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      placeholder="e.g. TXN123456"
                      className="premium-input w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="premium-label flex items-center gap-1.5">
                      Payment Notes <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Any payment remarks..."
                      className="premium-input w-full"
                    />
                  </div>
                </div>

                <BankSelector
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  label="Bank Account (required for Bank Transfer & Cheque)"
                  placeholder="Select bank account"
                  showDefaultIndicator={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Budget Summary Panel */}
        <div className="space-y-6">
          <div className="glass-card">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900">
                  <Wallet size={20} />
                </div>
                <h2 className="text-xl">Budget Overview</h2>
              </div>
              {isAdmin && (
                <Link
                  to={`/budgets${selectedOutletId ? `?outletId=${selectedOutletId}` : ""}`}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-navy-400 hover:text-gold-600 transition-colors"
                >
                  Manage Budget
                  <ArrowUpRight size={12} />
                </Link>
              )}
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
