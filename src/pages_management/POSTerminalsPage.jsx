import React, { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Monitor, Plus, Edit2, Trash2, CheckCircle2, Lock, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { fetchOutletsFromAPI } from "../../services/api";
import {
  fetchTerminalsAPI,
  createTerminalAPI,
  updateTerminalAPI,
  deleteTerminalAPI,
} from "../../services/posShiftApi";

export function POSTerminalsPage() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore();

  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOutlets();
  }, []);

  useEffect(() => {
    if (selectedOutletId) {
      loadTerminals(selectedOutletId);
    }
  }, [selectedOutletId]);

  const loadOutlets = async () => {
    try {
      const res = await fetchOutletsFromAPI();
      const list = res.data || res.outlets || res || [];
      setOutlets(list);
      if (list.length > 0) {
        setSelectedOutletId(user?.outlet_id?.toString() || list[0].id.toString());
      }
    } catch (err) {
      console.error("Error loading outlets:", err);
    }
  };

  const loadTerminals = async (outletId) => {
    setLoading(true);
    try {
      const res = await fetchTerminalsAPI(outletId);
      if (res.success) {
        setTerminals(res.terminals);
      }
    } catch (err) {
      toast.addToast(err.message || "Failed to load terminals", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTerminal(null);
    setFormName("");
    setFormCode("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (term) => {
    setEditingTerminal(term);
    setFormName(term.name);
    setFormCode(term.code || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitting(true);
    try {
      if (editingTerminal) {
        const res = await updateTerminalAPI(editingTerminal.id, {
          name: formName.trim(),
          code: formCode.trim(),
        });
        if (res.success) {
          toast.addToast("Terminal updated successfully", "success");
        }
      } else {
        const res = await createTerminalAPI({
          outlet_id: selectedOutletId,
          name: formName.trim(),
          code: formCode.trim(),
        });
        if (res.success) {
          toast.addToast("Terminal created successfully", "success");
        }
      }
      setIsModalOpen(false);
      loadTerminals(selectedOutletId);
    } catch (err) {
      toast.addToast(err.message || "Failed to save terminal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (term) => {
    if (!window.confirm(`Are you sure you want to deactivate terminal "${term.name}"?`)) return;

    try {
      const res = await deleteTerminalAPI(term.id);
      if (res.success) {
        toast.addToast("Terminal deactivated successfully", "success");
        loadTerminals(selectedOutletId);
      }
    } catch (err) {
      toast.addToast(err.message || "Failed to deactivate terminal", "error");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="POS Terminals Management"
        subtitle="Configure register terminals and till counters per outlet"
      >
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition shadow-md"
        >
          <Plus className="w-4 h-4" /> Add New Terminal
        </button>
      </PageHeader>

      {/* Outlet Selector Bar */}
      <div className="p-4 rounded-2xl bg-white border border-navy-100 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-xs">
          <label className="text-xs font-bold text-navy-700 whitespace-nowrap">Selected Outlet:</label>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => loadTerminals(selectedOutletId)}
          className="px-3.5 py-2 bg-navy-50 hover:bg-navy-100 text-navy-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Terminals Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-navy-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading register terminals...</p>
        </div>
      ) : terminals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-navy-100 shadow-sm">
          <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-navy-900 text-base mb-1">No Terminals Found</h4>
          <p className="text-xs text-slate-500 mb-4">No POS terminals configured for this outlet yet.</p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add First Terminal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terminals.map((term) => {
            const activeShift = term.shifts && term.shifts.length > 0 ? term.shifts[0] : null;

            return (
              <div
                key={term.id}
                className="p-5 rounded-2xl bg-white border border-navy-100 shadow-sm space-y-4 flex flex-col justify-between hover:border-indigo-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl font-bold shadow-xs ${
                        activeShift
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-navy-900 text-base">{term.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-navy-50 font-mono font-bold text-navy-700">
                        {term.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(term)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(term)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition"
                      title="Deactivate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-navy-50/60 border border-navy-100 text-xs">
                  {activeShift ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-700">
                        <span className="inline-flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Shift Active
                        </span>
                        <span>Shift #{activeShift.id}</span>
                      </div>
                      <p className="text-slate-600 font-medium">
                        Cashier: <strong className="text-navy-900">{activeShift.user?.name || "Staff"}</strong>
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Opened at: {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> Available for Shift
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Terminal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-navy-100 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-black text-lg text-navy-900">
              {editingTerminal ? "Edit Terminal" : "Create New POS Terminal"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">
                  Terminal Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Counter, Register 1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-navy-200 bg-white text-navy-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">
                  Terminal Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TERM-01"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-navy-200 bg-white text-navy-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-navy-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-navy-200 text-navy-700 text-xs font-bold hover:bg-navy-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Save Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
