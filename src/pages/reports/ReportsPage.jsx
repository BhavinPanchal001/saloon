import React, { useState, useEffect } from "react";
import { BarChart3, DollarSign, TrendingUp, TrendingDown, Receipt, Calendar, RefreshCw, Wallet, ShieldAlert } from "lucide-react";
import { fetchShiftEndReportAPI, fetchProfitLossReportAPI, fetchCustomerCreditReportAPI, fetchOutletsFromAPI } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";

export function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState("shift");
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(user?.outlet_id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [shiftReport, setShiftReport] = useState(null);
  const [pnlReport, setPnlReport] = useState(null);
  const [creditReport, setCreditReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOutletsFromAPI().then((res) => {
      setOutlets(res || []);
      if (res?.length > 0 && !selectedOutlet) {
        setSelectedOutlet(res[0].id);
      }
    });
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      if (activeTab === "shift" && selectedOutlet) {
        const data = await fetchShiftEndReportAPI(selectedOutlet, date);
        setShiftReport(data);
      } else if (activeTab === "pnl") {
        const data = await fetchProfitLossReportAPI(selectedOutlet, startDate, endDate);
        setPnlReport(data);
      } else if (activeTab === "credit") {
        const data = await fetchCustomerCreditReportAPI();
        setCreditReport(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeTab, selectedOutlet, date, startDate, endDate]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" /> Business Reports & Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">Audit daily shift register cash, revenue, customer credit & dues, and P&L statements.</p>
        </div>
        <button
          onClick={loadReports}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("shift")}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "shift" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Daily Shift End Register
        </button>
        <button
          onClick={() => setActiveTab("pnl")}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "pnl" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveTab("credit")}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "credit" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Customer Credit & Dues
        </button>
      </div>

      {/* Controls */}
      {activeTab !== "credit" && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Outlet</label>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium bg-white"
            >
              <option value="">All Outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {activeTab === "shift" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Shift Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Generating Report...</div>
      ) : activeTab === "shift" && shiftReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Bills</span>
              <p className="text-2xl font-bold text-slate-800">{shiftReport.totalBillsCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Net Sales</span>
              <p className="text-2xl font-bold text-indigo-600">₹{shiftReport.totalNetSales.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Cash Expenses</span>
              <p className="text-2xl font-bold text-rose-600">₹{shiftReport.totalCashExpenses.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-semibold text-emerald-600 uppercase">Expected Cash in Drawer</span>
              <p className="text-2xl font-bold text-emerald-700">₹{shiftReport.expectedCashInDrawer.toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Payment Modes Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(shiftReport.paymentBreakdown).map(([mode, amt]) => (
                <div key={mode} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-medium text-slate-500">{mode}</span>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">₹{amt.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "pnl" && pnlReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Net Sales Revenue</span>
              <p className="text-2xl font-bold text-indigo-600">₹{pnlReport.netRevenue.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Expenses</span>
              <p className="text-2xl font-bold text-rose-600">₹{pnlReport.totalExpenses.toLocaleString("en-IN")}</p>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm space-y-1 ${pnlReport.netProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
              <span className="text-xs font-semibold uppercase text-slate-600">Net Profit (Margin {pnlReport.profitMarginPercent}%)</span>
              <p className={`text-2xl font-bold ${pnlReport.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                ₹{pnlReport.netProfit.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Expenses by Category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(pnlReport.expensesByCategory).map(([cat, amt]) => (
                <div key={cat} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700">{cat}</span>
                  <span className="text-sm font-bold text-rose-600">₹{amt.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "credit" && creditReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase">Total Store Credit (We Owe)</span>
              <p className="text-2xl font-bold text-emerald-700">₹{Number(creditReport.totalStoreCredit || 0).toLocaleString("en-IN")}</p>
              <span className="text-xs text-emerald-600 font-medium">{creditReport.customersWithCreditCount} customers with advance credit</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-rose-600 uppercase">Total Outstanding Dues (They Owe Us)</span>
              <p className="text-2xl font-bold text-rose-700">₹{Number(creditReport.totalOutstandingDues || 0).toLocaleString("en-IN")}</p>
              <span className="text-xs text-rose-600 font-medium">{creditReport.customersWithDueCount} customers with unpaid dues</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Prepaid Advance Customers</span>
              <p className="text-2xl font-bold text-slate-800">{creditReport.customersWithCreditCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Outstanding Due Customers</span>
              <p className="text-2xl font-bold text-slate-800">{creditReport.customersWithDueCount}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Customer Balances Directory</h3>
            {creditReport.customers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">All customer balances are clean!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Net Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {creditReport.customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                        <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            c.creditBalance > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${c.creditBalance > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {c.creditBalance > 0 ? "+" : ""}₹{Number(c.creditBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

