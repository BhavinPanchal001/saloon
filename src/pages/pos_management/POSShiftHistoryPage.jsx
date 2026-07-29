import React, { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { History, Monitor, FileText, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { fetchOutletsFromAPI } from "../../services/api";
import { fetchShiftHistoryAPI, fetchXReportAPI } from "../../services/posShiftApi";
import { formatCurrency } from "../../utils/format";
import { ZReportPrintModal } from "../pos/components/ZReportPrintModal";

export function POSShiftHistoryPage() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore();

  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [isZReportOpen, setIsZReportOpen] = useState(false);

  useEffect(() => {
    loadOutlets();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [selectedOutletId, statusFilter, startDate, endDate]);

  const loadOutlets = async () => {
    try {
      const res = await fetchOutletsFromAPI();
      const list = res.data || res.outlets || res || [];
      setOutlets(list);
      if (list.length > 0) {
        setSelectedOutletId(user?.outlet_id?.toString() || "");
      }
    } catch (err) {
      console.error("Error loading outlets:", err);
    }
  };

  const loadShifts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedOutletId) params.outlet_id = selectedOutletId;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await fetchShiftHistoryAPI(params);
      if (res.success) {
        setShifts(res.shifts);
      }
    } catch (err) {
      toast.addToast(err.message || "Failed to load shift history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (shift) => {
    try {
      const res = await fetchXReportAPI(shift.id);
      if (res.success) {
        setSelectedReport(res.report);
        setIsZReportOpen(true);
      }
    } catch (err) {
      toast.addToast(err.message || "Failed to fetch shift report", "error");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="POS Shift History & Z-Reports"
        subtitle="Audit past cashier shifts, register floats, and cash variances"
      />

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-navy-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs font-bold text-navy-700 mb-1">Outlet</label>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-navy-700 mb-1">Shift Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Active / OPEN</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-navy-700 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-navy-700 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <button
            onClick={loadShifts}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Fetching shift history...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-navy-900 text-base mb-1">No Shifts Found</h4>
            <p className="text-xs text-slate-500">No shift records match your selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-navy-50/60 uppercase text-[10px] font-bold tracking-wider text-navy-400 border-b border-navy-100">
                <tr>
                  <th className="p-3.5">Shift ID / Terminal</th>
                  <th className="p-3.5">Outlet</th>
                  <th className="p-3.5">Cashier</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Opened At</th>
                  <th className="p-3.5">Closed At</th>
                  <th className="p-3.5">Opening Float</th>
                  <th className="p-3.5">Actual Cash</th>
                  <th className="p-3.5">Variance</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {shifts.map((s) => {
                  const variance = parseFloat(s.variance || 0);

                  return (
                    <tr key={s.id} className="hover:bg-navy-50/40 transition">
                      <td className="p-3.5 font-medium text-navy-900">
                        <div className="font-black">Shift #{s.id}</div>
                        <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                          <Monitor className="w-3 h-3 text-indigo-500" />
                          {s.terminal?.name || "Terminal"}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{s.outlet?.name || "-"}</td>
                      <td className="p-3.5 font-bold text-navy-900">
                        {s.user?.name || "Cashier"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                            s.status === "OPEN"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-navy-50 text-navy-600 border border-navy-200"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[11px] font-medium text-slate-600">
                        {s.opened_at ? new Date(s.opened_at).toLocaleString() : "-"}
                      </td>
                      <td className="p-3.5 text-[11px] font-medium text-slate-600">
                        {s.closed_at ? new Date(s.closed_at).toLocaleString() : "-"}
                      </td>
                      <td className="p-3.5 font-bold text-navy-900">
                        {formatCurrency(s.opening_cash)}
                      </td>
                      <td className="p-3.5 font-bold text-navy-900">
                        {s.status === "CLOSED" ? formatCurrency(s.actual_closing_cash) : "-"}
                      </td>
                      <td className="p-3.5 font-black">
                        {s.status === "CLOSED" ? (
                          <span className={variance < 0 ? "text-rose-600" : "text-emerald-600"}>
                            {formatCurrency(variance)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleViewReport(s)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5" /> Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Z-Report Modal */}
      <ZReportPrintModal
        isOpen={isZReportOpen}
        onClose={() => setIsZReportOpen(false)}
        report={selectedReport}
      />
    </div>
  );
}
