import React, { useState } from "react";
import { Monitor, Plus, CheckCircle, Lock, X } from "lucide-react";

export function TerminalSelectModal({
  isOpen,
  onClose,
  terminals = [],
  selectedTerminal,
  onSelectTerminal,
  onCreateTerminal,
  loading = false,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTerminalName, setNewTerminalName] = useState("");
  const [newTerminalCode, setNewTerminalCode] = useState("");

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTerminalName.trim()) return;
    await onCreateTerminal({ name: newTerminalName.trim(), code: newTerminalCode.trim() });
    setNewTerminalName("");
    setNewTerminalCode("");
    setShowAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 md:p-6 pt-12 pb-12 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-navy-100 mt-8 mb-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-bold shadow-sm">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-navy-900 text-lg">Select POS Terminal</h3>
              <p className="text-xs text-slate-500 font-medium">Choose a register terminal to start billing</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {terminals.length === 0 && !showAdd ? (
            <div className="text-center py-8 bg-navy-50/40 rounded-2xl border border-dashed border-navy-200">
              <Monitor className="w-12 h-12 text-navy-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-navy-800 mb-1">No POS terminals configured yet.</p>
              <p className="text-xs text-slate-500 mb-4">Add your first terminal register to proceed.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add First Terminal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {terminals.map((term) => {
                const isSelected = selectedTerminal?.id === term.id;
                const activeShift = term.shifts && term.shifts.length > 0 ? term.shifts[0] : null;

                return (
                  <div
                    key={term.id}
                    onClick={() => onSelectTerminal(term)}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/60 shadow-sm"
                        : "border-navy-100 hover:border-indigo-200 bg-white hover:bg-navy-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${
                          activeShift
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-navy-900 text-sm">{term.name}</h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-navy-100 text-navy-700">
                            {term.code}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5">
                          {activeShift ? (
                            <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Shift active by {activeShift.user?.name || "Cashier"}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Available for Shift
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                  </div>
                );
              })}
            </div>
          )}

          {showAdd && (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-navy-50/60 border border-navy-200 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-navy-700">Create New POS Terminal</h4>
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">Terminal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Counter 1, Register A"
                  value={newTerminalName}
                  onChange={(e) => setNewTerminalName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-navy-200 bg-white text-navy-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">Terminal Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TERM-01"
                  value={newTerminalCode}
                  onChange={(e) => setNewTerminalCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-navy-200 bg-white text-navy-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-navy-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Save Terminal
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-navy-100 flex justify-between items-center">
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Terminal
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => selectedTerminal && onSelectTerminal(selectedTerminal)}
              disabled={!selectedTerminal || loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md inline-flex items-center gap-2"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
