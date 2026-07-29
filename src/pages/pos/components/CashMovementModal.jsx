import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";

export function CashMovementModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) {
  const [type, setType] = useState("CASH_IN");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) return;
    onSubmit({ type, amount: numAmt, reason: reason.trim() });
    setAmount("");
    setReason("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 md:p-6 pt-12 pb-12 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-navy-100 mt-8 mb-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl font-bold shadow-sm ${
                type === "CASH_IN"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {type === "CASH_IN" ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-navy-900 text-lg">Cash Drawer Movement</h3>
              <p className="text-xs text-slate-500 font-medium">Record cash paid in or taken out of drawer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-navy-50/60 rounded-2xl border border-navy-100">
            <button
              type="button"
              onClick={() => setType("CASH_IN")}
              className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                type === "CASH_IN"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-navy-800"
              }`}
            >
              <ArrowDownRight className="w-4 h-4" /> Cash In (Float)
            </button>
            <button
              type="button"
              onClick={() => setType("CASH_OUT")}
              className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                type === "CASH_OUT"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-500 hover:text-navy-800"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Cash Out (Drop)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number"
                min="0.01"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-900 font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1">
              Reason / Explanation *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === "CASH_IN" ? "e.g. Float top-up" : "e.g. Petty expenses / Bank deposit drop"}
              className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
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
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md inline-flex items-center gap-2 ${
                type === "CASH_IN"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              Submit {type === "CASH_IN" ? "Cash In" : "Cash Out"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
