import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Printer, RefreshCw, X, Calendar, User, Monitor } from "lucide-react";
import { fetchXReportAPI, updateShiftAPI } from "../../../services/posShiftApi";
import { formatCurrency } from "../../../utils/format";

export function XReportModal({ isOpen, onClose, shiftId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isEditingFloat, setIsEditingFloat] = useState(false);
  const [floatInput, setFloatInput] = useState("");
  const [savingFloat, setSavingFloat] = useState(false);

  const loadReport = async () => {
    if (!shiftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchXReportAPI(shiftId);
      if (res.success) {
        setReport(res.report);
      }
    } catch (err) {
      setError(err.message || "Failed to load X-Report");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFloat = async () => {
    const num = parseFloat(floatInput);
    if (isNaN(num) || num < 0) return;

    setSavingFloat(true);
    try {
      const res = await updateShiftAPI(shiftId, { opening_cash: num });
      if (res.success) {
        setIsEditingFloat(false);
        loadReport();
      }
    } catch (err) {
      console.error("Failed to update opening float:", err);
    } finally {
      setSavingFloat(false);
    }
  };

  useEffect(() => {
    if (isOpen && shiftId) {
      loadReport();
    }
  }, [isOpen, shiftId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 md:p-6 pt-12 pb-12 backdrop-blur-sm overflow-y-auto printable-z-modal">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-navy-100 mt-8 mb-8 animate-in fade-in zoom-in-95 duration-200 printable-z-wrapper">
        <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-navy-900 text-lg">POS X-Report (Mid-Shift Summary)</h3>
              <p className="text-xs text-slate-500 font-medium">Live financial overview for current active shift</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadReport}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Calculating mid-shift figures...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm font-bold">{error}</div>
        ) : report ? (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible printable-z-report">
            {/* Header for print */}
            <div className="hidden print:block text-center pb-2 border-b border-dashed border-slate-300 mb-3">
              <h2 className="font-bold text-sm uppercase">POS MID-SHIFT X-REPORT</h2>
              <p className="text-[11px]">{report.shift?.outlet?.name || "Glowy Saloon"}</p>
            </div>

            {/* Shift Header Meta */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-navy-50/60 rounded-2xl border border-navy-100 text-xs">
              <div>
                <span className="text-navy-400 block text-[10px] font-bold uppercase tracking-wider">Terminal</span>
                <span className="font-bold text-navy-900 inline-flex items-center gap-1 mt-0.5">
                  <Monitor className="w-3.5 h-3.5 text-indigo-600 print:hidden" />
                  {report.shift?.terminal?.name || "Terminal"}
                </span>
              </div>
              <div>
                <span className="text-navy-400 block text-[10px] font-bold uppercase tracking-wider">Cashier</span>
                <span className="font-bold text-navy-900 inline-flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-indigo-600 print:hidden" />
                  {report.shift?.user?.name || "Staff"}
                </span>
              </div>
              <div>
                <span className="text-navy-400 block text-[10px] font-bold uppercase tracking-wider">Opened At</span>
                <span className="font-bold text-navy-900 inline-flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 print:hidden" />
                  {new Date(report.shift?.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Sales Metrics */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-navy-100 bg-white shadow-sm">
                  <span className="text-slate-500 font-medium">Bills Generated</span>
                  <p className="text-lg font-black text-navy-900 mt-0.5">{report.billsCount} Bills</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-navy-100 bg-white shadow-sm">
                  <span className="text-slate-500 font-medium">Total Gross Sales</span>
                  <p className="text-lg font-black text-indigo-600 mt-0.5">{formatCurrency(report.totalSales)}</p>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="p-4 rounded-2xl border border-navy-100 bg-navy-50/40 space-y-2 text-xs">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-navy-400 mb-2">Payment Method Breakdown</h4>
                <div className="flex justify-between py-1 border-b border-navy-100">
                  <span className="text-navy-700 font-medium">💵 Cash Sales</span>
                  <span className="font-bold text-navy-900">{formatCurrency(report.cashSales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-navy-100">
                  <span className="text-navy-700 font-medium">💳 Card Sales</span>
                  <span className="font-bold text-navy-900">{formatCurrency(report.cardSales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-navy-100">
                  <span className="text-navy-700 font-medium">📱 UPI Sales</span>
                  <span className="font-bold text-navy-900">{formatCurrency(report.upiSales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-navy-100">
                  <span className="text-navy-700 font-medium">🏷️ Store Credit / Other</span>
                  <span className="font-bold text-navy-900">{formatCurrency(report.creditSales + report.otherSales)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Discounts Applied</span>
                  <span>{formatCurrency(report.totalDiscount)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Taxes Collected</span>
                  <span>{formatCurrency(report.totalTax)}</span>
                </div>
              </div>
            </div>

            {/* Cash Drawer Balance & Reconciliation Box */}
            <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 space-y-2 text-xs">
              <h4 className="font-bold text-indigo-900 text-sm flex items-center justify-between">
                <span>Expected Drawer Cash Balance</span>
                <span className="text-xl font-black text-indigo-600">{formatCurrency(report.expectedCash)}</span>
              </h4>
              <div className="pt-2 border-t border-indigo-200/60 space-y-1.5 text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1 font-medium">
                    Opening Float:
                    {isEditingFloat ? (
                      <div className="inline-flex items-center gap-1 ml-2 print:hidden">
                        <input
                          type="number"
                          step="any"
                          value={floatInput}
                          onChange={(e) => setFloatInput(e.target.value)}
                          className="w-24 px-2 py-0.5 text-xs font-bold rounded-lg border border-indigo-400 bg-white text-navy-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveFloat}
                          disabled={savingFloat}
                          className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingFloat(false)}
                          className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded-md text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFloatInput(report.openingCash.toString());
                          setIsEditingFloat(true);
                        }}
                        className="text-[10px] text-indigo-600 font-bold hover:underline ml-1.5 print:hidden"
                        title="Edit opening float amount"
                      >
                        (Edit)
                      </button>
                    )}
                  </span>
                  <span className="font-bold text-navy-900">+{formatCurrency(report.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span className="font-bold text-emerald-600">+{formatCurrency(report.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash In (Floats):</span>
                  <span className="font-bold text-emerald-600">+{formatCurrency(report.totalCashIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Out (Drops/Expenses):</span>
                  <span className="font-bold text-amber-600">-{formatCurrency(report.totalCashOut)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 pt-4 border-t border-navy-100 flex justify-between items-center print:hidden">
          <button
            onClick={handlePrint}
            disabled={!report}
            className="px-4 py-2.5 bg-navy-50 hover:bg-navy-100 text-navy-800 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> Print X-Report
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
