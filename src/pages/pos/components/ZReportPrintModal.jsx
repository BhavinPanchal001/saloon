import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, CheckCircle, X, MessageCircle, Send, Check, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "../../../utils/format";
import { sendZReportWhatsAppAPI } from "../../../services/posShiftApi";
import { useToastStore } from "../../../stores/toastStore";

export function ZReportPrintModal({
  isOpen,
  onClose,
  report,
}) {
  const toast = useToastStore();
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [whatsappRecipient, setWhatsappRecipient] = useState("");
  const [showCustomPhoneModal, setShowCustomPhoneModal] = useState(false);
  const [customPhone, setCustomPhone] = useState("");

  useEffect(() => {
    if (report) {
      if (report.whatsapp?.success) {
        setWhatsappSent(true);
        setWhatsappRecipient(report.whatsapp.recipient || "");
      } else {
        setWhatsappSent(false);
        setWhatsappRecipient("");
      }
      setShowCustomPhoneModal(false);
      setCustomPhone("");
    }
  }, [report, isOpen]);

  if (!isOpen || !report) return null;

  const shift = report.shift || {};
  const terminal = shift.terminal || {};
  const user = shift.user || {};
  const outlet = shift.outlet || {};

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async (overridePhone = null) => {
    if (!shift.id) return;
    setSendingWhatsApp(true);
    try {
      const payload = overridePhone ? { phone: overridePhone } : {};
      const res = await sendZReportWhatsAppAPI(shift.id, payload);
      if (res.success) {
        setWhatsappSent(true);
        setWhatsappRecipient(res.result?.recipient || overridePhone || "Owner");
        setShowCustomPhoneModal(false);
        toast.success(res.message || "Z-Report PDF and summary sent via WhatsApp!");
      } else {
        toast.error(res.message || "Failed to send WhatsApp message");
      }
    } catch (err) {
      const errMsg = err.message || "";
      if (errMsg.toLowerCase().includes("no owner whatsapp") || errMsg.toLowerCase().includes("missing")) {
        setShowCustomPhoneModal(true);
      } else {
        toast.error(errMsg || "Failed to send Z-Report via WhatsApp");
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleCustomPhoneSubmit = (e) => {
    e.preventDefault();
    if (!customPhone.trim()) {
      toast.error("Please enter a WhatsApp phone number");
      return;
    }
    handleSendWhatsApp(customPhone.trim());
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 md:p-6 pt-12 pb-12 backdrop-blur-sm overflow-y-auto printable-z-modal">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-navy-100 mt-8 mb-8 animate-in fade-in zoom-in-95 duration-200 printable-z-wrapper">
        <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-navy-900 text-base">Shift Closed — Z-Report</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Delivery Status Badge */}
        {whatsappSent ? (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <div>
                <p className="font-bold text-emerald-900">Sent to Owner on WhatsApp</p>
                <p className="text-[11px] text-emerald-700 font-mono">
                  {whatsappRecipient ? `Recipient: ${whatsappRecipient}` : "Delivered with PDF attachment"}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSendWhatsApp()}
              disabled={sendingWhatsApp}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 ml-2 shrink-0 disabled:opacity-50"
            >
              Re-send
            </button>
          </div>
        ) : (
          report.whatsapp && !report.whatsapp.success && (
            <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">
                  Auto-dispatch note: {report.whatsapp.reason || report.whatsapp.error || "Owner number not set"}
                </span>
              </div>
              <button
                onClick={() => setShowCustomPhoneModal(true)}
                className="text-[11px] font-bold text-amber-900 underline ml-2 shrink-0"
              >
                Enter Phone
              </button>
            </div>
          )
        )}

        {/* Custom Phone Prompt (if owner phone was not set) */}
        {showCustomPhoneModal && (
          <form onSubmit={handleCustomPhoneSubmit} className="mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 print:hidden">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Send Z-Report to WhatsApp Number:
              </label>
              <button
                type="button"
                onClick={() => setShowCustomPhoneModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="e.g. +60123456789"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={sendingWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                {sendingWhatsApp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send
              </button>
            </div>
          </form>
        )}

        {/* Printable Thermal Receipt Style Box */}
        <div className="p-6 font-mono text-xs text-slate-900 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 printable-z-report">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h2 className="font-bold text-base uppercase tracking-wider text-slate-900">END OF SHIFT Z-REPORT</h2>
            <p className="font-sans text-xs text-slate-600 font-bold">{outlet.name || "Glowy Saloon"}</p>
            <p className="text-[11px] text-slate-500">Shift #{shift.id} • Terminal: {terminal.name || "Counter 1"}</p>
          </div>

          {/* Meta Info */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3 text-slate-700">
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span className="font-bold text-slate-900">{user.name || "Staff"}</span>
            </div>
            <div className="flex justify-between">
              <span>Opened:</span>
              <span>{shift.opened_at ? new Date(shift.opened_at).toLocaleString() : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>Closed:</span>
              <span>{shift.closed_at ? new Date(shift.closed_at).toLocaleString() : "-"}</span>
            </div>
          </div>

          {/* Sales Performance Summary */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-slate-700">
            <div className="font-bold uppercase text-[11px] mb-1 text-slate-900">=== SALES SUMMARY ===</div>
            <div className="flex justify-between">
              <span>Total Bills:</span>
              <span>{report.billsCount}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900">
              <span>Gross Sales:</span>
              <span>{formatCurrency(report.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Sales:</span>
              <span>{formatCurrency(report.cashSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Card Sales:</span>
              <span>{formatCurrency(report.cardSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>UPI Sales:</span>
              <span>{formatCurrency(report.upiSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credit/Other:</span>
              <span>{formatCurrency(report.creditSales + report.otherSales)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total Discounts:</span>
              <span>{formatCurrency(report.totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total Tax:</span>
              <span>{formatCurrency(report.totalTax)}</span>
            </div>
          </div>

          {/* Drawer Reconciliation */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-slate-700">
            <div className="font-bold uppercase text-[11px] mb-1 text-slate-900">=== DRAWER RECONCILIATION ===</div>
            <div className="flex justify-between">
              <span>Opening Float:</span>
              <span>{formatCurrency(report.openingCash)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Cash Sales:</span>
              <span>+{formatCurrency(report.cashSales)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Cash In:</span>
              <span>+{formatCurrency(report.totalCashIn)}</span>
            </div>
            <div className="flex justify-between text-amber-700 font-semibold">
              <span>Cash Out:</span>
              <span>-{formatCurrency(report.totalCashOut)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-300 pt-1 text-slate-900">
              <span>Expected Cash:</span>
              <span>{formatCurrency(report.expectedCash)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900">
              <span>Actual Cash Counted:</span>
              <span>{formatCurrency(shift.actual_closing_cash || 0)}</span>
            </div>
            <div className={`flex justify-between font-bold ${
              (shift.variance || 0) < 0 ? "text-rose-700" : "text-emerald-700"
            }`}>
              <span>Variance (Over/Short):</span>
              <span>{formatCurrency(shift.variance || 0)}</span>
            </div>
          </div>

          {shift.closing_notes && (
            <div className="text-[11px] italic text-slate-600">
              Note: {shift.closing_notes}
            </div>
          )}

          <div className="text-center text-[10px] text-slate-400 pt-2 font-bold">
            *** END OF SHIFT REPORT ***
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-navy-100 flex flex-wrap gap-2 justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={() => handleSendWhatsApp()}
              disabled={sendingWhatsApp}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              {sendingWhatsApp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="w-3.5 h-3.5" /> {whatsappSent ? "Re-send WhatsApp" : "Send WhatsApp"}
                </>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-navy-50 hover:bg-navy-100 text-navy-800 rounded-xl text-xs font-bold transition"
          >
            Done & Finish
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

