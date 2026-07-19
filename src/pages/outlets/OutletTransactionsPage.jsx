import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  fetchOutletsFromAPI,
  fetchOutletFinancialSummaryFromAPI,
  fetchExpensesFromAPI,
  fetchPurchaseOrdersFromAPI,
  fetchBillsFromAPI,
  fetchBudgetHistoryFromAPI,
  fetchAvailableMonthsFromAPI,
  updateMonthlyBudgetAPI,
} from "../../services/api";
import {
  Store,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  ShoppingCart,
  PieChart,
  Calendar,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  FileText,
  ArrowLeft,
} from "lucide-react";

export function OutletTransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedOutletIdParam = searchParams.get("outletId");
  const selectedMonthParam = searchParams.get("monthKey") || "";

  // Data states
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(selectedOutletIdParam || "");
  const [selectedMonth, setSelectedMonth] = useState(selectedMonthParam);
  const [availableMonths, setAvailableMonths] = useState([]);
  
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Active tab state: 'budget' | 'expenses' | 'purchase_orders' | 'sales'
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "budget");

  // Tab 1: Budget states
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [budgetReason, setBudgetReason] = useState("");
  const [updatingBudget, setUpdatingBudget] = useState(false);

  // Tab 2: Expense states
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState("");

  // Tab 3: Purchase Order states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [poStatusFilter, setPoStatusFilter] = useState("all");
  const [poSearch, setPoSearch] = useState("");

  // Tab 4: Sales History states
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billSearch, setBillSearch] = useState("");
  const [billPaymentFilter, setBillPaymentFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState(null);

  // 1. Initial Load: Fetch Outlets and Available Months
  useEffect(() => {
    fetchOutletsFromAPI()
      .then((data) => {
        setOutlets(data || []);
        if (data && data.length > 0 && !selectedOutletIdParam) {
          setSelectedOutletId(String(data[0].id));
        }
      })
      .catch((err) => console.error("Error fetching outlets:", err));

    fetchAvailableMonthsFromAPI()
      .then((months) => setAvailableMonths(months || []))
      .catch(() => setAvailableMonths([]));
  }, []);

  // Sync state with URL params
  useEffect(() => {
    if (selectedOutletIdParam && selectedOutletIdParam !== selectedOutletId) {
      setSelectedOutletId(selectedOutletIdParam);
    }
  }, [selectedOutletIdParam]);

  // 2. Load Financial Summary whenever outlet or month changes
  const loadFinancialSummary = () => {
    if (!selectedOutletId) return;
    setLoadingSummary(true);
    setLoadError(null);

    fetchOutletFinancialSummaryFromAPI(selectedOutletId, { monthKey: selectedMonth })
      .then((res) => {
        setSummary(res);
      })
      .catch((err) => {
        console.error("Error loading financial summary:", err);
        setLoadError("Failed to load outlet summary data.");
      })
      .finally(() => setLoadingSummary(false));
  };

  useEffect(() => {
    loadFinancialSummary();
  }, [selectedOutletId, selectedMonth]);

  // 3. Tab Specific Data Loading
  useEffect(() => {
    if (!selectedOutletId) return;

    // Update query params
    const params = new URLSearchParams();
    if (selectedOutletId) params.set("outletId", selectedOutletId);
    if (selectedMonth) params.set("monthKey", selectedMonth);
    params.set("tab", activeTab);
    setSearchParams(params, { replace: true });

    if (activeTab === "budget") {
      setLoadingBudget(true);
      fetchBudgetHistoryFromAPI({ outletId: selectedOutletId, monthKey: selectedMonth })
        .then(setBudgetHistory)
        .catch(() => setBudgetHistory([]))
        .finally(() => setLoadingBudget(false));
    } else if (activeTab === "expenses") {
      setLoadingExpenses(true);
      fetchExpensesFromAPI({ outletId: selectedOutletId, monthKey: selectedMonth })
        .then(setExpenses)
        .catch(() => setExpenses([]))
        .finally(() => setLoadingExpenses(false));
    } else if (activeTab === "purchase_orders") {
      setLoadingPOs(true);
      fetchPurchaseOrdersFromAPI({ outletId: selectedOutletId })
        .then(setPurchaseOrders)
        .catch(() => setPurchaseOrders([]))
        .finally(() => setLoadingPOs(false));
    } else if (activeTab === "sales") {
      setLoadingBills(true);
      fetchBillsFromAPI({ outletId: selectedOutletId })
        .then(setBills)
        .catch(() => setBills([]))
        .finally(() => setLoadingBills(false));
    }
  }, [selectedOutletId, selectedMonth, activeTab]);

  // Outlet Selection Handler
  const handleOutletChange = (e) => {
    const id = e.target.value;
    setSelectedOutletId(id);
  };

  // Budget Update Handler
  const handleBudgetUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!newBudgetAmount || Number(newBudgetAmount) < 0) return;
    setUpdatingBudget(true);

    try {
      await updateMonthlyBudgetAPI({
        outletId: selectedOutletId,
        amount: Number(newBudgetAmount),
        monthKey: selectedMonth || summary?.monthKey,
        reason: budgetReason || "Budget adjustment from Financial Hub",
      });
      setIsBudgetModalOpen(false);
      setNewBudgetAmount("");
      setBudgetReason("");
      loadFinancialSummary();
      // Reload budget tab history
      fetchBudgetHistoryFromAPI({ outletId: selectedOutletId, monthKey: selectedMonth })
        .then(setBudgetHistory);
    } catch (err) {
      alert("Failed to update budget: " + (err.message || "Server error"));
    } finally {
      setUpdatingBudget(false);
    }
  };

  // Filtered data computations
  const filteredExpenses = expenses.filter((exp) => {
    if (!expenseSearch) return true;
    const q = expenseSearch.toLowerCase();
    return (
      exp.itemName?.toLowerCase().includes(q) ||
      exp.billNo?.toLowerCase().includes(q)
    );
  });

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesStatus = poStatusFilter === "all" || po.status === poStatusFilter;
    const matchesSearch =
      !poSearch ||
      po.poNumber?.toLowerCase().includes(poSearch.toLowerCase()) ||
      po.supplierName?.toLowerCase().includes(poSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredBills = bills.filter((b) => {
    const matchesPayment =
      billPaymentFilter === "all" || b.paymentMethod === billPaymentFilter;
    const matchesSearch =
      !billSearch ||
      b.billNumber?.toLowerCase().includes(billSearch.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(billSearch.toLowerCase()) ||
      b.customer?.phone?.toLowerCase().includes(billSearch.toLowerCase());
    return matchesPayment && matchesSearch;
  });

  const currentOutlet = outlets.find((o) => String(o.id) === String(selectedOutletId));

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate("/outlets")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-navy-900 transition-colors text-xs font-bold shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Outlets
        </button>
      </div>

      {/* Header */}
      <PageHeader
        eyebrow="Financial & Module Hub"
        title="Outlet Financial Transactions"
        description="Comprehensive summary of assigned budget, created expenses, purchase orders, and total sales history for the selected outlet."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Outlet Selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
              <Store size={18} className="text-navy-600" />
              <select
                value={selectedOutletId}
                onChange={handleOutletChange}
                className="bg-transparent font-bold text-navy-900 text-sm focus:outline-hidden cursor-pointer"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code || o.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
              <Calendar size={18} className="text-gold-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-medium text-slate-700 text-sm focus:outline-hidden cursor-pointer"
              >
                <option value="">All Time / Current Month</option>
                {availableMonths.map((m) => (
                  <option key={m.month_key} value={m.month_key}>
                    {m.month_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => loadFinancialSummary()}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-navy-900 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loadingSummary ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={loadFinancialSummary} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Top Statistic Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Sales Revenue */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-100">
                Total Earned (Sales)
              </p>
              <h3 className="text-2xl font-black mt-1">
                RM {(summary?.totalEarned || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <TrendingUp size={22} className="text-emerald-100" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-emerald-100 border-t border-white/10 pt-2">
            <span>{summary?.totalBillsCount || 0} Paid Bills</span>
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full">POS Earned</span>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-700 text-white rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-rose-100">
                Total Expenses
              </p>
              <h3 className="text-2xl font-black mt-1">
                RM {(summary?.totalExpenses || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <TrendingDown size={22} className="text-rose-100" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-rose-100 border-t border-white/10 pt-2">
            <span>{summary?.expensesCount || 0} Expenses Logged</span>
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full">Outlet Spent</span>
          </div>
        </div>

        {/* Card 3: Purchase Orders Cost */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-blue-100">
                Purchase Orders Cost
              </p>
              <h3 className="text-2xl font-black mt-1">
                RM {(summary?.totalPOCost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <ShoppingCart size={22} className="text-blue-100" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-blue-100 border-t border-white/10 pt-2">
            <span>{summary?.poCount || 0} Purchase Orders</span>
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full">Procurement</span>
          </div>
        </div>

        {/* Card 4: Net Profit / Earned vs Expense Statistic */}
        <div
          className={`rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between text-white ${
            (summary?.netProfit || 0) >= 0
              ? "bg-gradient-to-br from-navy-800 to-slate-900"
              : "bg-gradient-to-br from-amber-600 to-red-700"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                Net Profit / Statistic
              </p>
              <h3 className="text-2xl font-black mt-1">
                RM {Math.abs(summary?.netProfit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <DollarSign size={22} className="text-gold-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs border-t border-white/10 pt-2">
            <span className="text-slate-300">Net Surplus/Deficit</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                (summary?.netProfit || 0) >= 0
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40"
                  : "bg-rose-500/30 text-rose-200 border border-rose-400/40"
              }`}
            >
              {(summary?.netProfit || 0) >= 0 ? "Surplus" : "Deficit"}
            </span>
          </div>
        </div>

        {/* Card 5: Budget Allocation */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Assigned Budget
                </p>
                <h3 className="text-xl font-bold text-navy-900 mt-1">
                  RM {(summary?.assignedBudget || 0).toLocaleString("en-US")}
                </h3>
              </div>
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="p-1.5 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors cursor-pointer"
                title="Edit Outlet Budget"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Budget utilization progress bar */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Spent: RM {(summary?.totalExpenses || 0).toLocaleString()}</span>
                <span>{summary?.spendPercentage || 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary?.spendPercentage || 0) > 90
                      ? "bg-rose-500"
                      : (summary?.spendPercentage || 0) > 75
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, summary?.spendPercentage || 0)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
            <span>Remaining Balance</span>
            <span className="font-bold text-navy-900">
              RM {(summary?.remainingBudget || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabulation Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200 bg-slate-50/50 p-2 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("budget")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "budget"
                ? "bg-navy-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <PieChart size={18} />
            1. Assigned Budget
            {summary?.assignedBudget > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gold-500/20 text-gold-400 font-mono">
                RM {summary.assignedBudget.toLocaleString()}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "expenses"
                ? "bg-navy-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Receipt size={18} />
            2. Outlet Expenses
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 font-mono">
              {summary?.expensesCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("purchase_orders")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "purchase_orders"
                ? "bg-navy-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <ShoppingCart size={18} />
            3. Purchase Orders
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 font-mono">
              {summary?.poCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "sales"
                ? "bg-navy-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <TrendingUp size={18} />
            4. Total Sales History
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 font-mono">
              {summary?.totalBillsCount || 0}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6">
          {/* TAB 1: ASSIGNED BUDGET & REVISION HISTORY */}
          {activeTab === "budget" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-navy-50/50 p-4 rounded-xl border border-navy-100">
                <div>
                  <h4 className="font-bold text-navy-900 text-base">
                    Outlet Budget Allocation & Revision Log
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track allocated funds, spending performance, and historical modifications for {currentOutlet?.name || "this outlet"}.
                  </p>
                </div>
                <button
                  onClick={() => setIsBudgetModalOpen(true)}
                  className="btn-premium-primary text-xs cursor-pointer"
                >
                  <Plus size={16} />
                  Update Monthly Budget
                </button>
              </div>

              {loadingBudget ? (
                <div className="py-12 text-center text-slate-400 font-medium animate-pulse">
                  Loading budget history...
                </div>
              ) : budgetHistory.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <PieChart size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No budget revision records found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click "Update Monthly Budget" to allocate funds for this outlet.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Month Key</th>
                        <th>Previous Budget</th>
                        <th>New Budget</th>
                        <th>Change</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetHistory.map((history) => (
                        <tr key={history.id}>
                          <td className="font-medium text-slate-700">
                            {new Date(history.changedAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>
                            <span className="status-badge bg-slate-100 text-slate-700 font-mono">
                              {history.monthKey}
                            </span>
                          </td>
                          <td className="text-slate-500 font-mono">
                            RM {Number(history.previousAmount).toLocaleString()}
                          </td>
                          <td className="font-bold text-navy-900 font-mono">
                            RM {Number(history.newAmount).toLocaleString()}
                          </td>
                          <td>
                            <span
                              className={`status-badge font-bold ${
                                history.changeType === "increase"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {history.changeType === "increase" ? "+" : "-"}RM {Number(history.changeAmount).toLocaleString()}
                            </span>
                          </td>
                          <td className="text-slate-600 text-xs">
                            {history.reason || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTLET EXPENSES */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[240px] bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search expenses by item name or bill number..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="bg-transparent text-sm w-full focus:outline-hidden text-slate-800 placeholder-slate-400"
                  />
                </div>
                <Link to="/expenses/add" className="btn-premium-primary text-xs">
                  <Plus size={16} />
                  Add New Expense
                </Link>
              </div>

              {loadingExpenses ? (
                <div className="py-12 text-center text-slate-400 font-medium animate-pulse">
                  Loading outlet expenses...
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Receipt size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No expenses recorded for this outlet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting search filter or create a new expense entry.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Bill / Receipt #</th>
                        <th>Month</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id}>
                          <td className="font-bold text-navy-900">{exp.itemName}</td>
                          <td>
                            <span className="status-badge bg-slate-100 text-slate-700 font-mono">
                              {exp.billNo || "N/A"}
                            </span>
                          </td>
                          <td className="text-xs font-mono text-slate-600">{exp.monthKey}</td>
                          <td className="text-slate-600">{exp.qty ?? "—"}</td>
                          <td className="text-slate-600 font-mono">RM {exp.price?.toLocaleString()}</td>
                          <td className="font-bold text-rose-700 font-mono">
                            RM {exp.totalAmount?.toLocaleString()}
                          </td>
                          <td className="text-xs text-slate-500">
                            {new Date(exp.createdAt).toLocaleDateString("en-US")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PURCHASE ORDERS */}
          {activeTab === "purchase_orders" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[240px] bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search PO number or supplier name..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="bg-transparent text-sm w-full focus:outline-hidden text-slate-800 placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
                  <Filter size={16} className="text-slate-400" />
                  <select
                    value={poStatusFilter}
                    onChange={(e) => setPoStatusFilter(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All PO Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <Link to="/inventory/purchase-orders/new" className="btn-premium-primary text-xs">
                  <Plus size={16} />
                  New Purchase Order
                </Link>
              </div>

              {loadingPOs ? (
                <div className="py-12 text-center text-slate-400 font-medium animate-pulse">
                  Loading purchase orders...
                </div>
              ) : filteredPOs.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <ShoppingCart size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No purchase orders found for this outlet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Create a purchase order to track tablet & inventory procurement.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>PO #</th>
                        <th>Supplier</th>
                        <th>Order Date</th>
                        <th>Items Count</th>
                        <th>Tax Rate</th>
                        <th>Total Cost</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPOs.map((po) => (
                        <tr key={po.id}>
                          <td className="font-bold text-navy-900 font-mono">{po.poNumber}</td>
                          <td className="font-medium text-slate-800">{po.supplierName}</td>
                          <td className="text-slate-600 text-xs">{po.orderDate || "N/A"}</td>
                          <td className="text-slate-600 text-center font-bold">{po.items?.length || 0}</td>
                          <td className="text-slate-600">{po.taxRate}%</td>
                          <td className="font-bold text-blue-700 font-mono">
                            RM {po.totalCost?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span
                              className={`status-badge uppercase text-xs ${
                                po.status === "received"
                                  ? "status-active"
                                  : po.status === "approved"
                                  ? "bg-blue-50 text-blue-700"
                                  : po.status === "pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : "status-inactive"
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TOTAL SALES HISTORY (POS BILLS) */}
          {activeTab === "sales" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[240px] bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sales by bill number, customer name, or phone..."
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    className="bg-transparent text-sm w-full focus:outline-hidden text-slate-800 placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
                  <Filter size={16} className="text-slate-400" />
                  <select
                    value={billPaymentFilter}
                    onChange={(e) => setBillPaymentFilter(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Payment Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              {loadingBills ? (
                <div className="py-12 text-center text-slate-400 font-medium animate-pulse">
                  Loading sales history...
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <TrendingUp size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No POS sales records found for this outlet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Sales created via POS module will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Bill #</th>
                        <th>Customer</th>
                        <th>Payment Method</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                        <th>Tax</th>
                        <th>Total Amount</th>
                        <th>Date & Time</th>
                        <th className="w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBills.map((bill) => (
                        <tr key={bill.id}>
                          <td className="font-bold text-navy-900 font-mono">{bill.billNumber}</td>
                          <td>
                            <div className="font-semibold text-slate-800">{bill.customer?.name || "Walk-in Customer"}</div>
                            {bill.customer?.phone && (
                              <div className="text-xs text-slate-500">{bill.customer.phone}</div>
                            )}
                          </td>
                          <td>
                            <span className="status-badge bg-navy-50 text-navy-700 font-semibold">
                              {bill.paymentMethod}
                            </span>
                          </td>
                          <td className="text-slate-600 text-center font-bold">
                            {bill.lineItems?.length || 0}
                          </td>
                          <td className="text-slate-600 font-mono">RM {bill.subtotal?.toLocaleString()}</td>
                          <td className="text-slate-600 font-mono">RM {bill.tax?.toLocaleString()}</td>
                          <td className="font-bold text-emerald-700 font-mono">
                            RM {bill.total?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-xs text-slate-500">
                            {new Date(bill.createdAt).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="p-1.5 rounded-lg bg-navy-50 text-navy-600 hover:bg-navy-100 transition-colors cursor-pointer"
                              title="View Bill Receipt"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Budget Edit Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-navy-900 text-lg flex items-center gap-2">
                <PieChart className="text-gold-600" size={20} />
                Set Monthly Outlet Budget
              </h3>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBudgetUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Outlet
                </label>
                <div className="p-2.5 bg-slate-100 rounded-xl text-navy-900 font-bold text-sm">
                  {currentOutlet?.name} ({currentOutlet?.code})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New Monthly Budget Amount (RM)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  placeholder="e.g. 50000"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-navy-500 font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Reason / Modification Note
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Special campaign budget allocation"
                  value={budgetReason}
                  onChange={(e) => setBudgetReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-navy-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingBudget}
                  className="btn-premium-primary text-sm cursor-pointer"
                >
                  {updatingBudget ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Receipt Preview Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-navy-900 text-lg flex items-center gap-2">
                <FileText className="text-emerald-600" size={20} />
                Bill Receipt #{selectedBill.billNumber}
              </h3>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block">Customer Name</span>
                  <span className="font-bold text-navy-900">{selectedBill.customer?.name || "Walk-in"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Payment Method</span>
                  <span className="font-bold text-emerald-700">{selectedBill.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Outlet</span>
                  <span className="font-semibold text-slate-700">{currentOutlet?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Bill Date</span>
                  <span className="text-slate-700">
                    {new Date(selectedBill.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Line Items ({selectedBill.lineItems?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2">Item Name</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedBill.lineItems || []).map((li, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium text-slate-800">{li.itemName}</td>
                          <td className="p-2 text-center font-bold text-slate-600">{li.qty}</td>
                          <td className="p-2 text-right font-mono text-slate-800">
                            RM {(li.price * li.qty).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-1.5 font-mono text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>RM {selectedBill.subtotal?.toLocaleString()}</span>
                </div>
                {selectedBill.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span>-RM {selectedBill.discountAmount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>RM {selectedBill.tax?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-black text-navy-900 pt-2 border-t border-slate-200">
                  <span>Total Paid</span>
                  <span className="text-emerald-700">RM {selectedBill.total?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBill(null)}
                className="btn-premium-primary text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
