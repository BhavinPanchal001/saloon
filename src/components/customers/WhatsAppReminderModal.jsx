import React, { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  Send,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Loader2,
  Clock,
  Phone,
  Wallet,
} from "lucide-react";
import { fetchCustomerLedgerAPI, sendCustomerDueReminderWhatsAppAPI } from "../../services/api";
import { getCompanyInfo } from "../../utils/companyInfo";

export function WhatsAppReminderModal({
  customer,
  targetBill = null,
  initialPendingBills = null,
  onClose,
  onSent,
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingBills, setPendingBills] = useState(initialPendingBills || []);
  const [totalDue, setTotalDue] = useState(0);
  const [customMessage, setCustomMessage] = useState("");
  const [fallbackWaLink, setFallbackWaLink] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const companyInfo = getCompanyInfo();
  const currency = companyInfo.currency || "₹";
  const salonName = companyInfo.name || "Glowy Saloon";
  const salonPhone = companyInfo.phone || "";

  // Helper to generate the standard message template
  const buildTemplate = (bills, dueAmount) => {
    let billsBreakdown = "";
    if (bills && bills.length > 0) {
      billsBreakdown = bills
        .map((b) => {
          const dateStr = b.createdAt
            ? new Date(b.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "";
          const bNum = b.billNumber || b.bill_number || b.id;
          const dueVal = Number(b.remainingDue !== undefined ? b.remainingDue : b.total || 0).toFixed(2);
          return `• *Bill #${bNum}*${dateStr ? ` (${dateStr})` : ""}: ${currency}${dueVal}`;
        })
        .join("\n");
    }

    const phoneSection = salonPhone ? `\n📞 *Questions / Assistance:* ${salonPhone}` : "";

    return (
      `🔔 *PAYMENT REMINDER* — *${salonName}* ✨\n\n` +
      `Dear *${customer?.name || "Valued Customer"}*,\n\n` +
      `Greetings from *${salonName}*! We hope you enjoyed your visit.\n` +
      `This is a friendly reminder regarding your outstanding bill payment.\n\n` +
      (billsBreakdown ? `📋 *Pending Bills / Due Statement:*\n${billsBreakdown}\n━━━━━━━━━━━━━━━━━━━━\n` : "") +
      `💰 *Total Amount Due:* *${currency}${Number(dueAmount).toFixed(2)}*\n\n` +
      `💳 You may settle your balance at the salon counter on your next visit or via UPI.\n` +
      `${phoneSection}\n\n` +
      `If you have already cleared this payment, please disregard this message.\n` +
      `Thank you for choosing ${salonName}! 💆‍♀️💇‍♂️✨`
    );
  };

  useEffect(() => {
    const initData = async () => {
      if (!customer?.id) return;

      if (targetBill) {
        // Single bill reminder mode
        const dueVal = Number(targetBill.remainingDue !== undefined ? targetBill.remainingDue : targetBill.total || 0);
        const singleList = [targetBill];
        setPendingBills(singleList);
        setTotalDue(dueVal);
        setCustomMessage(buildTemplate(singleList, dueVal));
        return;
      }

      if (initialPendingBills && initialPendingBills.length > 0) {
        const sum = initialPendingBills.reduce((s, b) => s + Number(b.remainingDue || b.total || 0), 0);
        const creditBal = Math.abs(Number(customer.credit_balance || 0));
        const finalDue = sum > 0 ? sum : creditBal;
        setPendingBills(initialPendingBills);
        setTotalDue(finalDue);
        setCustomMessage(buildTemplate(initialPendingBills, finalDue));
        return;
      }

      // Otherwise, fetch latest ledger statement for up-to-date pending bills
      setLoading(true);
      try {
        const data = await fetchCustomerLedgerAPI(customer.id);
        const bills = data.pendingBills || [];
        setPendingBills(bills);

        const sum = bills.reduce((s, b) => s + Number(b.remainingDue || b.total || 0), 0);
        const creditBal = Math.abs(Number(data.customer?.credit_balance || customer.credit_balance || 0));
        const finalDue = sum > 0 ? sum : creditBal;
        setTotalDue(finalDue);
        setCustomMessage(buildTemplate(bills, finalDue));
      } catch (err) {
        console.error("Error fetching ledger for reminder:", err);
        const creditBal = Math.abs(Number(customer.credit_balance || 0));
        setTotalDue(creditBal);
        setCustomMessage(buildTemplate([], creditBal));
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [customer?.id, targetBill]);

  // Compute live wa.me URL
  const cleanPhone = (customer?.phone || "").replace(/[^0-9]/g, "");
  const liveWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage || "")}`;

  const handleResetTemplate = () => {
    setCustomMessage(buildTemplate(pendingBills, totalDue));
    setIsEditing(false);
  };

  const handleSendDirect = async () => {
    if (!customer?.phone) {
      setError("Customer does not have a registered phone number.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await sendCustomerDueReminderWhatsAppAPI(customer.id, {
        bill_id: targetBill ? targetBill.id : undefined,
        customMessage: customMessage.trim() || undefined,
        forceSend: true,
      });

      if (res.waLink) {
        setFallbackWaLink(res.waLink);
      }

      if (res.success) {
        setSuccessMsg(res.message || "WhatsApp reminder sent successfully!");
        if (onSent) onSent();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        // Backend couldn't send directly (e.g. Baileys offline) but provided fallback waLink
        setError(res.message || "WhatsApp service could not dispatch directly. Please use 'Open in WhatsApp Web'.");
      }
    } catch (err) {
      setError(err.message || "Failed to send WhatsApp reminder. You can still open WhatsApp Web.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    const url = fallbackWaLink || liveWaUrl;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-xs">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Send WhatsApp Payment Reminder
              </h2>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span>To: <strong className="text-slate-700">{customer?.name}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <Phone className="w-3 h-3" /> {customer?.phone || "No phone number"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              <p className="mt-1 text-[11px] text-rose-600 font-normal">
                You can still click <strong>"Open in WhatsApp Web"</strong> below to send directly from your browser.
              </p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-semibold">Loading statement details...</span>
          </div>
        ) : (
          <>
            {/* Due Statement Highlight Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-amber-900 block">
                  {targetBill ? `Pending Bill #${targetBill.billNumber || targetBill.bill_number}` : "Outstanding Total Due"}
                </span>
                <p className="text-xs text-amber-700">
                  {targetBill
                    ? "Targeted reminder for this specific bill."
                    : pendingBills.length > 0
                    ? `${pendingBills.length} unpaid bill${pendingBills.length > 1 ? "s" : ""} pending payment`
                    : "Outstanding balance on customer account"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-rose-600 tracking-tight">
                  {currency}{Number(totalDue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Pending Bills Breakdown List (if multiple) */}
            {pendingBills.length > 0 && !targetBill && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    Pending Bills Breakdown
                  </span>
                  <span>{pendingBills.length} Bills</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200/60">
                  {pendingBills.map((b) => (
                    <div key={b.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Bill #{b.billNumber || b.bill_number}</span>
                        {b.createdAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-rose-600">
                        {currency}{Number(b.remainingDue !== undefined ? b.remainingDue : b.total || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Preview & Customization Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp Message Preview
                </label>
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline transition-all"
                  title="Reset to default template"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Template
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={8}
                  value={customMessage}
                  onChange={(e) => {
                    setCustomMessage(e.target.value);
                    setIsEditing(true);
                  }}
                  className="w-full font-mono text-xs text-slate-800 bg-emerald-50/20 border border-emerald-200 rounded-2xl p-3.5 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 leading-relaxed transition-all resize-y shadow-inner"
                  placeholder="Type reminder message..."
                />
                <span className="absolute bottom-3 right-3 text-[10px] text-slate-400 bg-white/90 px-2 py-0.5 rounded-md border border-slate-100">
                  {customMessage.length} characters
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                You can freely edit or customize this message before sending.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors text-center"
              >
                Cancel
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Secondary: Open WhatsApp Web */}
                <button
                  type="button"
                  onClick={handleOpenWhatsAppWeb}
                  disabled={!customer?.phone}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  title="Open chat in WhatsApp Web with prefilled message"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in WhatsApp Web
                </button>

                {/* Primary: Direct WhatsApp API Send */}
                <button
                  type="button"
                  onClick={handleSendDirect}
                  disabled={submitting || !customer?.phone}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send via WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
