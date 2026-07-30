import React, { useState, useEffect } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  RefreshCw,
  Wallet,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  Download,
  Percent,
  Calculator,
  ChevronRight,
  ChevronDown,
  Package,
  Users,
  CreditCard,
  ShoppingBag,
  Briefcase,
  Layers,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  fetchShiftEndReportAPI,
  fetchProfitLossReportAPI,
  fetchCustomerCreditReportAPI,
  fetchGstReportAPI,
  fetchTopSellingReportAPI,
  fetchStockSummaryReportAPI,
  fetchLowStockReportAPI,
  fetchPurchaseOrdersReportAPI,
  fetchEmployeeAttendanceReportAPI,
  fetchEmployeePayrollReportAPI,
  fetchGstr2ReportAPI,
  fetchOutletsFromAPI,
  downloadReportFileAPI,
} from "../../services/api";
import { useAuthStore } from "../../stores/authStore";

// Safe Currency & Number Formatter
const fmt = (val, minDigits = 0) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return "0";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: 2,
  });
};

export function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedReportId, setSelectedReportId] = useState(null); // null = Directory View
  const [expandedCategories, setExpandedCategories] = useState({
    sales: true,
    inventory: true,
    gst: true,
    employee: true,
    customer: true,
    expense: true,
    business: true,
  });

  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(user?.outlet_id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  useEffect(() => {
    fetchOutletsFromAPI().then((res) => {
      setOutlets(res || []);
      if (res?.length > 0 && !selectedOutlet) {
        setSelectedOutlet(res[0].id);
      }
    });
  }, []);

  const loadActiveReport = async () => {
    if (!selectedReportId) return;
    setLoading(true);
    setReportData(null);
    try {
      let data = null;
      if (selectedReportId === "shift") {
        data = await fetchShiftEndReportAPI(selectedOutlet, date);
      } else if (selectedReportId === "pnl") {
        data = await fetchProfitLossReportAPI(selectedOutlet, startDate, endDate);
      } else if (selectedReportId === "gst") {
        data = await fetchGstReportAPI(selectedOutlet, startDate, endDate);
      } else if (selectedReportId === "top-selling") {
        data = await fetchTopSellingReportAPI(selectedOutlet, startDate, endDate);
      } else if (selectedReportId === "stock-summary") {
        data = await fetchStockSummaryReportAPI(selectedOutlet);
      } else if (selectedReportId === "low-stock") {
        data = await fetchLowStockReportAPI(selectedOutlet);
      } else if (selectedReportId === "purchase-orders") {
        data = await fetchPurchaseOrdersReportAPI(selectedOutlet, startDate, endDate);
      } else if (selectedReportId === "employee-attendance") {
        data = await fetchEmployeeAttendanceReportAPI(selectedOutlet, startDate, endDate);
      } else if (selectedReportId === "employee-payroll") {
        data = await fetchEmployeePayrollReportAPI();
      } else if (selectedReportId === "gstr2") {
        data = await fetchGstr2ReportAPI(selectedOutlet, startDate, endDate);
      } else if (selectedReportId === "credit") {
        data = await fetchCustomerCreditReportAPI();
      }
      setReportData(data);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReportId) {
      loadActiveReport();
    }
  }, [selectedReportId, selectedOutlet, date, startDate, endDate]);

  const toggleCategory = (catKey) => {
    setExpandedCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const handleDownload = async (format) => {
    if (!selectedReportId) return;
    setDownloadingFormat(format);
    try {
      const params = { outletId: selectedOutlet };
      if (selectedReportId === "shift") {
        params.date = date;
      } else {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      await downloadReportFileAPI(selectedReportId, format, params);
    } catch (err) {
      console.error(`Error downloading ${format} report:`, err);
      alert(`Failed to download ${format.toUpperCase()} report.`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Directory Categories matching Reference Screenshots
  const reportCategories = [
    {
      key: "sales",
      title: "Sales Reports",
      icon: TrendingUp,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconColor: "text-emerald-600 bg-emerald-100",
      reports: [
        { id: "shift", name: "Daily Shift Register & Cashier Report", desc: "Audit shift register cash, expenses, drawer balance & payment breakdown." },
        { id: "top-selling", name: "Top Selling Items Report", desc: "Rank services and products by volume sold and revenue generated." },
        { id: "gst", name: "Sales Summary & Tax Register", desc: "Overview of sales revenue, discounts, taxable value, and tax liabilities." },
      ],
    },
    {
      key: "inventory",
      title: "Purchase & Inventory Reports",
      icon: Package,
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      iconColor: "text-sky-600 bg-sky-100",
      reports: [
        { id: "stock-summary", name: "Stock Summary & Valuation Report", desc: "Current stock quantity, unit cost, selling price, and inventory valuation." },
        { id: "low-stock", name: "Low Stock Alert Report", desc: "List of products falling below minimum safety reorder thresholds." },
        { id: "purchase-orders", name: "Purchase Order Summary Report", desc: "Vendor orders count, total purchase spend, and status breakdown." },
      ],
    },
    {
      key: "gst",
      title: "GST & Tax Reports",
      icon: Percent,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      iconColor: "text-amber-600 bg-amber-100",
      reports: [
        { id: "gst", name: "GST Sales Report (GSTR-1 Format)", desc: "Itemized sales invoices with CGST (9%), SGST (9%), Total Tax & Taxable Value." },
        { id: "gstr2", name: "GST Purchase Report (GSTR-2 Format)", desc: "Vendor purchases and Input Tax Credit (ITC) tax breakdown for filing." },
      ],
    },
    {
      key: "employee",
      title: "Employee & Payroll Reports",
      icon: Users,
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconColor: "text-indigo-600 bg-indigo-100",
      reports: [
        { id: "employee-attendance", name: "Employee Attendance Report", desc: "Audit Present, Absent, Half-day, and Leave records per staff member." },
        { id: "employee-payroll", name: "Employee Salary & Commission Report", desc: "Base salary, service commissions earned, PF deductions, and net payout." },
      ],
    },
    {
      key: "customer",
      title: "Party & Customer Reports",
      icon: CreditCard,
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      iconColor: "text-rose-600 bg-rose-100",
      reports: [
        { id: "credit", name: "Customer Store Credit & Dues Directory", desc: "Track advance customer credits (we owe) vs unpaid dues (they owe us)." },
      ],
    },
    {
      key: "business",
      title: "Business & Financial Reports",
      icon: Briefcase,
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      iconColor: "text-purple-600 bg-purple-100",
      reports: [
        { id: "pnl", name: "Profit & Loss Statement", desc: "Gross Revenue minus total operational expenses to calculate Net Profit and Margin %." },
      ],
    },
  ];

  const getActiveReportMeta = () => {
    for (const cat of reportCategories) {
      const found = cat.reports.find((r) => r.id === selectedReportId);
      if (found) return { ...found, categoryTitle: cat.title };
    }
    return { name: "Report", categoryTitle: "Reports" };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Main Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          {selectedReportId ? (
            <button
              onClick={() => setSelectedReportId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to All Report Directories
            </button>
          ) : null}
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            {selectedReportId ? getActiveReportMeta().name : "Business Reports & Analytics Hub"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {selectedReportId
              ? getActiveReportMeta().desc
              : "Comprehensive audit reports for Sales, Inventory, GST Tax, Employees, Customers, and Financial P&L."}
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedReportId ? (
            <>
              <button
                onClick={loadActiveReport}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button
                onClick={() => handleDownload("csv")}
                disabled={downloadingFormat !== null}
                className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold px-4 py-2 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                {downloadingFormat === "csv" ? "Exporting..." : "Export CSV"}
              </button>
              <button
                onClick={() => handleDownload("pdf")}
                disabled={downloadingFormat !== null}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm shadow-sm disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {downloadingFormat === "pdf" ? "Downloading..." : "Download PDF"}
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl">
              Select any report directory below to generate data
            </div>
          )}
        </div>
      </div>

      {/* Directory Hub View (Matching Reference Screenshots) */}
      {!selectedReportId ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportCategories.map((cat) => {
              const IconComp = cat.icon;
              const isExpanded = expandedCategories[cat.key];

              return (
                <div
                  key={cat.key}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all"
                >
                  {/* Category Header Card */}
                  <div
                    onClick={() => toggleCategory(cat.key)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${cat.iconColor}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-800">{cat.title}</h2>
                        <span className="text-xs text-slate-400">{cat.reports.length} report modules</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cat.badgeColor}`}>
                        {cat.reports.length} Reports
                      </span>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {/* Accordion Item Rows */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/40">
                      {cat.reports.map((rep) => (
                        <div
                          key={rep.id}
                          onClick={() => setSelectedReportId(rep.id)}
                          className="p-4 pl-14 hover:bg-indigo-50/40 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                              {rep.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{rep.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Active Report Detail View */
        <div className="space-y-6">
          {/* Controls Bar */}
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
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedReportId === "shift" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Shift Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>
            ) : selectedReportId !== "credit" && selectedReportId !== "stock-summary" && selectedReportId !== "low-stock" ? (
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
            ) : null}
          </div>

          {/* Report Data Display */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-medium">Generating Report...</div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* TOP SELLING REPORT */}
              {selectedReportId === "top-selling" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Unique Items Sold</span>
                      <p className="text-2xl font-bold text-slate-800">{fmt(reportData?.totalItemsCount)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Units Sold</span>
                      <p className="text-2xl font-bold text-indigo-600">{fmt(reportData?.totalQuantitySold)}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-emerald-700 uppercase">Total Items Revenue</span>
                      <p className="text-2xl font-bold text-emerald-800">₹{fmt(reportData?.totalRevenue)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Top Selling Services & Products Ranking</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">Rank</th>
                            <th className="px-4 py-3">Item Description</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-center">Quantity Sold</th>
                            <th className="px-4 py-3 text-right">Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.items || []).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-bold text-slate-400">#{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                  item.type === "service" ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-800">{item.qtySold}</td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-600">₹{fmt(item.totalRevenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* STOCK SUMMARY REPORT */}
              {selectedReportId === "stock-summary" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Master Products</span>
                      <p className="text-2xl font-bold text-slate-800">{fmt(reportData?.totalProducts)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Available Stock Units</span>
                      <p className="text-2xl font-bold text-indigo-600">{fmt(reportData?.totalStockQty)}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-emerald-700 uppercase">Total Inventory Asset Valuation</span>
                      <p className="text-2xl font-bold text-emerald-800">₹{fmt(reportData?.totalValuation, 2)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Product Stock Levels & Asset Valuation</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">Product Name</th>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-center">In Stock Qty</th>
                            <th className="px-4 py-3 text-right">Cost Price</th>
                            <th className="px-4 py-3 text-right">Selling Price</th>
                            <th className="px-4 py-3 text-right">Stock Valuation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.items || []).map((i) => (
                            <tr key={i.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800">{i.name}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs font-mono">{i.sku}</td>
                              <td className="px-4 py-3 text-slate-600">{i.category}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-800">{i.currentStock} {i.unit}</td>
                              <td className="px-4 py-3 text-right text-slate-600">₹{fmt(i.costPrice, 2)}</td>
                              <td className="px-4 py-3 text-right text-slate-800 font-semibold">₹{fmt(i.sellingPrice, 2)}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{fmt(i.totalValuation, 2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* LOW STOCK ALERT REPORT */}
              {selectedReportId === "low-stock" && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-700 uppercase">Critical Low Stock Products</span>
                      <p className="text-3xl font-extrabold text-amber-800 mt-1">{reportData?.lowStockCount || 0} Products Below Threshold</p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-amber-600" />
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Inventory Items Requiring Immediate Reorder</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">Product Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-center">Current Stock</th>
                            <th className="px-4 py-3 text-center">Min Alert Level</th>
                            <th className="px-4 py-3 text-center">Shortage Quantity</th>
                            <th className="px-4 py-3 text-right">Selling Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.items || []).map((i) => (
                            <tr key={i.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800">{i.name}</td>
                              <td className="px-4 py-3 text-slate-600">{i.category}</td>
                              <td className="px-4 py-3 text-center font-bold text-rose-600">{i.currentStock}</td>
                              <td className="px-4 py-3 text-center text-slate-500">{i.minStock}</td>
                              <td className="px-4 py-3 text-center font-bold text-amber-600">+{i.shortage} units</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{fmt(i.sellingPrice, 2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PURCHASE ORDERS REPORT */}
              {selectedReportId === "purchase-orders" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Purchase Orders</span>
                      <p className="text-2xl font-bold text-slate-800">{fmt(reportData?.totalOrdersCount)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Vendor Spend</span>
                      <p className="text-2xl font-bold text-indigo-600">₹{fmt(reportData?.totalSpend)}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-amber-700 uppercase">Pending POs</span>
                      <p className="text-2xl font-bold text-amber-800">{fmt(reportData?.pendingCount)}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-emerald-700 uppercase">Received POs</span>
                      <p className="text-2xl font-bold text-emerald-800">{fmt(reportData?.receivedCount)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Vendor Purchase Orders Directory</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">PO Number</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Vendor Name</th>
                            <th className="px-4 py-3">Outlet</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Tax Amount</th>
                            <th className="px-4 py-3 text-right">Total PO Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.orders || []).map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800">{o.poNumber}</td>
                              <td className="px-4 py-3 text-slate-600">{o.date}</td>
                              <td className="px-4 py-3 text-slate-800 font-medium">{o.vendorName}</td>
                              <td className="px-4 py-3 text-slate-600">{o.outletName}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                                  o.status === "received" || o.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">₹{fmt(o.taxAmount, 2)}</td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-600">₹{fmt(o.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* EMPLOYEE ATTENDANCE REPORT */}
              {selectedReportId === "employee-attendance" && (
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Active Staff Members</span>
                    <p className="text-2xl font-bold text-slate-800">{reportData?.totalEmployees || 0} Employees</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Employee Attendance Breakdown Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">Employee Name</th>
                            <th className="px-4 py-3">Emp Code</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3 text-center text-emerald-600">Present</th>
                            <th className="px-4 py-3 text-center text-rose-600">Absent</th>
                            <th className="px-4 py-3 text-center text-amber-600">Half Day</th>
                            <th className="px-4 py-3 text-center text-blue-600">Leave</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.staffSummary || []).map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs font-mono">{s.employeeCode}</td>
                              <td className="px-4 py-3 text-slate-600">{s.role}</td>
                              <td className="px-4 py-3 text-center font-bold text-emerald-600">{s.present} days</td>
                              <td className="px-4 py-3 text-center font-bold text-rose-600">{s.absent} days</td>
                              <td className="px-4 py-3 text-center font-bold text-amber-600">{s.halfDay} days</td>
                              <td className="px-4 py-3 text-center font-bold text-blue-600">{s.leave} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* EMPLOYEE PAYROLL REPORT */}
              {selectedReportId === "employee-payroll" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Staff Count</span>
                      <p className="text-2xl font-bold text-slate-800">{reportData?.totalEmployees || 0}</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-indigo-700 uppercase">Total Monthly Net Payroll Outflow</span>
                      <p className="text-2xl font-bold text-indigo-800">₹{fmt(reportData?.totalPayrollSpend)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Staff Salary & Commission Breakdown Register</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">Staff Name</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3 text-right">Base Salary</th>
                            <th className="px-4 py-3 text-right">Commissions</th>
                            <th className="px-4 py-3 text-right">Gross Salary</th>
                            <th className="px-4 py-3 text-right">PF Deductions</th>
                            <th className="px-4 py-3 text-right">Net Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.payrollSummary || []).map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                              <td className="px-4 py-3 text-slate-600">{s.role}</td>
                              <td className="px-4 py-3 text-right text-slate-600">₹{fmt(s.baseSalary)}</td>
                              <td className="px-4 py-3 text-right text-emerald-600 font-semibold">+₹{fmt(s.commissionAmount)}</td>
                              <td className="px-4 py-3 text-right text-slate-800 font-semibold">₹{fmt(s.grossSalary)}</td>
                              <td className="px-4 py-3 text-right text-rose-600">-₹{fmt(s.deductions)}</td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-600">₹{fmt(s.netSalary)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* GSTR-2 PURCHASE REPORT */}
              {selectedReportId === "gstr2" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Purchase Orders</span>
                      <p className="text-2xl font-bold text-slate-800">{reportData?.totalPurchaseOrders || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Purchase Taxable Value</span>
                      <p className="text-2xl font-bold text-indigo-600">₹{fmt(reportData?.totalTaxableValue, 2)}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-emerald-700 uppercase">Total Claimable ITC</span>
                      <p className="text-2xl font-bold text-emerald-800">₹{fmt(reportData?.totalItcClaimable, 2)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Gross Purchases</span>
                      <p className="text-2xl font-bold text-slate-800">₹{fmt(reportData?.totalPurchaseValue, 2)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">GSTR-2 Purchase ITC Tax Register</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">PO Number</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Vendor Name</th>
                            <th className="px-4 py-3">Vendor GSTIN</th>
                            <th className="px-4 py-3 text-right">Taxable Value</th>
                            <th className="px-4 py-3 text-right">CGST</th>
                            <th className="px-4 py-3 text-right">SGST</th>
                            <th className="px-4 py-3 text-right">ITC Tax</th>
                            <th className="px-4 py-3 text-right">Total PO Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.purchases || []).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800">{p.poNumber}</td>
                              <td className="px-4 py-3 text-slate-600">{p.date}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">{p.vendorName}</td>
                              <td className="px-4 py-3 text-xs text-slate-400 font-mono">{p.vendorGstin}</td>
                              <td className="px-4 py-3 text-right text-slate-800 font-medium">₹{fmt(p.taxableValue, 2)}</td>
                              <td className="px-4 py-3 text-right text-blue-600">₹{fmt(p.cgst, 2)}</td>
                              <td className="px-4 py-3 text-right text-teal-600">₹{fmt(p.sgst, 2)}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{fmt(p.totalTax, 2)}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800">₹{fmt(p.totalAmount, 2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* GST SALES REPORT */}
              {selectedReportId === "gst" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Paid Invoices</span>
                      <p className="text-2xl font-bold text-slate-800">{fmt(reportData?.totalBillsCount)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Taxable Value</span>
                      <p className="text-2xl font-bold text-indigo-600">₹{fmt(reportData?.totalTaxableAmount, 2)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-blue-600 uppercase">CGST (9%)</span>
                      <p className="text-2xl font-bold text-blue-700">₹{fmt(reportData?.totalCgst, 2)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-teal-600 uppercase">SGST (9%)</span>
                      <p className="text-2xl font-bold text-teal-700">₹{fmt(reportData?.totalSgst, 2)}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-amber-700 uppercase">Total GST</span>
                      <p className="text-2xl font-bold text-amber-800">₹{fmt(reportData?.totalTax, 2)}</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-indigo-700 uppercase">Gross Sales Revenue</span>
                      <p className="text-2xl font-bold text-indigo-800">₹{fmt(reportData?.totalNetRevenue, 2)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">GST Sales & Tax Register</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Itemized B2C & B2B GST tax compliance register</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-4 py-3">Invoice #</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Outlet</th>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                            <th className="px-4 py-3 text-right">Discount</th>
                            <th className="px-4 py-3 text-right">Taxable Value</th>
                            <th className="px-4 py-3 text-right">CGST (9%)</th>
                            <th className="px-4 py-3 text-right">SGST (9%)</th>
                            <th className="px-4 py-3 text-right">Total GST</th>
                            <th className="px-4 py-3 text-right">Total Net</th>
                            <th className="px-4 py-3 text-center">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(reportData?.bills || []).map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800">{b.bill_number}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.date}</td>
                              <td className="px-4 py-3 text-slate-600">{b.outlet_name}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{b.customer_name}</div>
                                {b.customer_phone && <div className="text-xs text-slate-400">{b.customer_phone}</div>}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-600">₹{fmt(b.gross_subtotal, 2)}</td>
                              <td className="px-4 py-3 text-right font-medium text-rose-600">
                                {b.discount_amount > 0 ? `-₹${fmt(b.discount_amount, 2)}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800">₹{fmt(b.taxable_amount, 2)}</td>
                              <td className="px-4 py-3 text-right text-blue-600 font-medium">₹{fmt(b.cgst_amount, 2)}</td>
                              <td className="px-4 py-3 text-right text-teal-600 font-medium">₹{fmt(b.sgst_amount, 2)}</td>
                              <td className="px-4 py-3 text-right text-amber-600 font-bold">₹{fmt(b.total_tax, 2)}</td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-600">₹{fmt(b.total_amount, 2)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                  {b.payment_method}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SHIFT REPORT */}
              {selectedReportId === "shift" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Bills</span>
                      <p className="text-2xl font-bold text-slate-800">{fmt(reportData?.totalBillsCount)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Net Sales</span>
                      <p className="text-2xl font-bold text-indigo-600">₹{fmt(reportData?.totalNetSales)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Cash Expenses</span>
                      <p className="text-2xl font-bold text-rose-600">₹{fmt(reportData?.totalCashExpenses)}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-emerald-600 uppercase">Expected Cash in Drawer</span>
                      <p className="text-2xl font-bold text-emerald-700">₹{fmt(reportData?.expectedCashInDrawer)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Payment Modes Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.entries(reportData?.paymentBreakdown || {}).map(([mode, amt]) => (
                        <div key={mode} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-xs font-medium text-slate-500">{mode}</span>
                          <p className="text-lg font-bold text-slate-800 mt-0.5">₹{fmt(amt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PROFIT & LOSS REPORT */}
              {selectedReportId === "pnl" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Net Sales Revenue</span>
                      <p className="text-2xl font-bold text-indigo-600">₹{fmt(reportData?.netRevenue)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Expenses</span>
                      <p className="text-2xl font-bold text-rose-600">₹{fmt(reportData?.totalExpenses)}</p>
                    </div>
                    <div className={`p-5 rounded-2xl border shadow-sm space-y-1 ${
                      (reportData?.netProfit || 0) >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                    }`}>
                      <span className="text-xs font-semibold uppercase text-slate-600">Net Profit (Margin {reportData?.profitMarginPercent || 0}%)</span>
                      <p className={`text-2xl font-bold ${
                        (reportData?.netProfit || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}>
                        ₹{fmt(reportData?.netProfit)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Expenses by Category</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(reportData?.expensesByCategory || {}).map(([cat, amt]) => (
                        <div key={cat} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                          <span className="text-sm font-semibold text-slate-700">{cat}</span>
                          <span className="text-sm font-bold text-rose-600">₹{fmt(amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CUSTOMER CREDIT REPORT */}
              {selectedReportId === "credit" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-emerald-600 uppercase">Total Store Credit (We Owe)</span>
                      <p className="text-2xl font-bold text-emerald-700">₹{fmt(reportData?.totalStoreCredit)}</p>
                      <span className="text-xs text-emerald-600 font-medium">{reportData?.customersWithCreditCount || 0} customers with advance credit</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl shadow-sm space-y-1">
                      <span className="text-xs font-bold text-rose-600 uppercase">Total Outstanding Dues (They Owe Us)</span>
                      <p className="text-2xl font-bold text-rose-700">₹{fmt(reportData?.totalOutstandingDues)}</p>
                      <span className="text-xs text-rose-600 font-medium">{reportData?.customersWithDueCount || 0} customers with unpaid dues</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Prepaid Advance Customers</span>
                      <p className="text-2xl font-bold text-slate-800">{reportData?.customersWithCreditCount || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Outstanding Due Customers</span>
                      <p className="text-2xl font-bold text-slate-800">{reportData?.customersWithDueCount || 0}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Customer Balances Directory</h3>
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
                          {(reportData?.customers || []).map((c) => (
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
                                {c.creditBalance > 0 ? "+" : ""}₹{fmt(c.creditBalance, 2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No report data found.</div>
          )}
        </div>
      )}
    </div>
  );
}
