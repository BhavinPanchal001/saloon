import React, { useState } from "react";
import { PlayCircle, Monitor, User, Store, X } from "lucide-react";

export function OpenShiftModal({
  isOpen,
  onClose,
  terminal,
  outletName,
  user,
  onOpenShift,
  loading = false,
}) {
  const [openingCash, setOpeningCash] = useState("0");
  const [openingNotes, setOpeningNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cashVal = parseFloat(openingCash) || 0;
    onOpenShift({
      pos_terminal_id: terminal?.id,
      opening_cash: cashVal,
      opening_notes: openingNotes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 md:p-6 pt-12 pb-12 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-navy-100 mt-8 mb-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold shadow-sm">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-navy-900 text-lg">Open POS Register Shift</h3>
              <p className="text-xs text-slate-500 font-medium">Start a new till session to begin sales</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-navy-50/60 border border-navy-100 text-xs">
            <div>
              <span className="text-navy-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Outlet</span>
              <span className="font-bold text-navy-900 inline-flex items-center gap-1.5 truncate">
                <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {outletName || terminal?.outlet?.name || "Outlet"}
              </span>
            </div>
            <div>
              <span className="text-navy-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Terminal</span>
              <span className="font-bold text-navy-900 inline-flex items-center gap-1.5 truncate">
                <Monitor className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {terminal?.name || "Counter 1"}
              </span>
            </div>
            <div>
              <span className="text-navy-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Cashier</span>
              <span className="font-bold text-navy-900 inline-flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {user?.name || "Staff User"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1">
              Opening Cash Float (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-900 font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Initial cash float inside register drawer</p>
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 mb-1.5">Quick Float Presets</span>
            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setOpeningCash(amt.toString())}
                  className="flex-1 py-1.5 rounded-xl border border-navy-200 bg-navy-50/50 text-xs font-bold text-navy-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1">
              Opening Notes (Optional)
            </label>
            <textarea
              rows="2"
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="e.g. Received float from supervisor..."
              className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-navy-100 flex justify-end gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-navy-200 text-navy-700 text-xs font-bold hover:bg-navy-50 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md inline-flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" /> Start Shift Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
