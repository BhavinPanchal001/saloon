import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, StopCircle, RefreshCw, X } from "lucide-react";
import { fetchXReportAPI, closeShiftAPI } from "../../../services/posShiftApi";
import { formatCurrency } from "../../../utils/format";

export function CloseShiftModal({
  isOpen,
  onClose,
  shiftId,
  onShiftClosed,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [error, setError] = useState(null);

  const loadMetrics = async () => {
    if (!shiftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchXReportAPI(shiftId);
      if (res.success) {
        setReport(res.report);
      }
    } catch (err) {
      setError(err.message || "Failed to calculate shift totals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && shiftId) {
      loadMetrics();
      setActualCash("");
      setClosingNotes("");
    }
  }, [isOpen, shiftId]);

  if (!isOpen) return null;

  const expectedCash = report ? report.expectedCash : 0;
  const numActual = parseFloat(actualCash) || 0;
  const variance = actualCash !== "" ? numActual - expectedCash : 0;

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (actualCash === "" || isNaN(numActual)) return;

    setClosingLoading(true);
    setError(null);
    try {
      const res = await closeShiftAPI(shiftId, {
        actual_closing_cash: numActual,
        closing_notes: closingNotes.trim(),
      });
      if (res.success) {
        onShiftClosed(res.report);
      }
    } catch (err) {
      setError(err.message || "Failed to close shift");
    } finally {
      setClosingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 md:p-6 pt-12 pb-12 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-navy-100 mt-8 mb-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 font-bold shadow-sm">
              <StopCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-navy-900 text-lg">Close POS Shift (Z-Report)</h3>
              <p className="text-xs text-slate-500 font-medium">Physical cash count & session closure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Calculating final drawer expectations...</p>
          </div>
        ) : (
          <form onSubmit={handleCloseShift} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {error}
              </div>
            )}

            {/* Expected vs Actual Cash Section */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl border border-navy-100 bg-navy-50/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-400 block">System Expected Cash</span>
                <span className="text-xl font-black text-navy-900 mt-1 block">
                  {formatCurrency(expectedCash)}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  Opening + Cash Sales + Net Floats
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">
                  Actual Physical Cash Count *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-900 font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Live Variance Calculation Badge */}
            {actualCash !== "" && (
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                  variance === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : variance > 0
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {variance < 0 ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                  <div>
                    <span>Cash Difference (Over / Short)</span>
                    <p className="text-[11px] font-normal opacity-80 mt-0.5">
                      {variance === 0
                        ? "Drawer balance matches expected cash perfectly."
                        : variance > 0
                        ? `Cash Surplus of ${formatCurrency(variance)}`
                        : `Cash Shortage of ${formatCurrency(Math.abs(variance))}`}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-black">{formatCurrency(variance)}</span>
              </div>
            )}

            {/* Sales Summary List */}
            {report && (
              <div className="p-4 rounded-2xl border border-navy-100 bg-navy-50/40 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Bills:</span>
                  <span className="font-bold text-navy-900">{report.billsCount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Gross Revenue:</span>
                  <span className="font-bold text-navy-900">{formatCurrency(report.totalSales)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cash Sales:</span>
                  <span className="font-bold text-navy-900">{formatCurrency(report.cashSales)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Card / UPI / Online Sales:</span>
                  <span className="font-bold text-navy-900">
                    {formatCurrency(report.cardSales + report.upiSales)}
                  </span>
                </div>
              </div>
            )}

            {/* Closing Notes */}
            <div>
              <label className="block text-xs font-bold text-navy-700 mb-1">
                Closing Remarks / Reason for Variance (Optional)
              </label>
              <textarea
                rows="2"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="e.g. ₹50 shortage due to change error..."
                className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-4 border-t border-navy-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-navy-200 text-navy-700 text-xs font-bold hover:bg-navy-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={closingLoading || actualCash === ""}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md inline-flex items-center gap-2"
              >
                {closingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                Finalize & Close Shift
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
