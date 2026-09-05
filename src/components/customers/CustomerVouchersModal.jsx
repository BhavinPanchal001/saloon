import React, { useState, useEffect } from "react";
import {
  Ticket,
  X,
  Plus,
  Send,
  Copy,
  CheckCircle2,
  Clock,
  Sparkles,
  Gift,
  Ban,
} from "lucide-react";
import {
  fetchCustomerVouchersAPI,
  issueVoucherAPI,
  cancelVoucherAPI,
  resendVoucherWhatsAppAPI,
} from "../../services/api";

export function CustomerVouchersModal({ customer, onClose, onVoucherIssued }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [msg, setMsg] = useState("");

  const [formData, setFormData] = useState({
    voucherType: "cash",
    value: "",
    minSpend: "",
    validityDays: "30",
    notes: "",
    sendWhatsApp: true,
  });

  const loadVouchers = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const res = await fetchCustomerVouchersAPI(customer.id);
      if (res.success) {
        setVouchers(res.data || []);
      }
    } catch (err) {
      console.error("Error loading customer vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, [customer?.id]);

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!formData.value || Number(formData.value) <= 0) return alert("Please enter a valid voucher value");

    setSubmitting(true);
    try {
      const days = parseInt(formData.validityDays, 10) || 30;
      const d = new Date();
      d.setDate(d.getDate() + days);
      const validUntil = d.toISOString().split("T")[0];

      const payload = {
        customerId: customer.id,
        voucherType: formData.voucherType,
        value: Number(formData.value),
        minSpend: formData.minSpend ? Number(formData.minSpend) : 0,
        validUntil,
        notes: formData.notes.trim() || undefined,
        sendWhatsApp: formData.sendWhatsApp,
      };

      const res = await issueVoucherAPI(payload);
      if (res.success) {
        setShowIssueForm(false);
        setFormData({
          voucherType: "cash",
          value: "",
          minSpend: "",
          validityDays: "30",
          notes: "",
          sendWhatsApp: true,
        });
        setMsg("Voucher issued successfully!");
        setTimeout(() => setMsg(""), 3000);
        await loadVouchers();
        if (onVoucherIssued) onVoucherIssued();
      }
    } catch (err) {
      alert(err.message || "Failed to issue voucher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleResend = async (v) => {
    try {
      const res = await resendVoucherWhatsAppAPI(v.id);
      if (res.success) {
        setMsg("WhatsApp message sent!");
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (err) {
      alert(err.message || "Failed to send WhatsApp");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this voucher?")) return;
    try {
      const res = await cancelVoucherAPI(id);
      if (res.success) {
        setMsg("Voucher cancelled.");
        setTimeout(() => setMsg(""), 3000);
        await loadVouchers();
      }
    } catch (err) {
      alert(err.message || "Failed to cancel voucher");
    }
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100/70 text-amber-700 rounded-xl">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{customer.name} - Vouchers</h3>
              <p className="text-xs text-gray-500">{customer.phone || "No phone registered"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showIssueForm && (
              <button
                onClick={() => setShowIssueForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue New</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Msg */}
        {msg && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* Issue Form Drawer */}
        {showIssueForm && (
          <form onSubmit={handleIssueSubmit} className="p-5 border-b border-gray-200 bg-amber-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Issue Voucher to {customer.name}</h4>
              <button
                type="button"
                onClick={() => setShowIssueForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Type</label>
                <select
                  value={formData.voucherType}
                  onChange={(e) => setFormData({ ...formData, voucherType: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="cash">Cash / Gift Value (₹)</option>
                  <option value="flat">Flat Discount (₹)</option>
                  <option value="percent">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Value {formData.voucherType === "percent" ? "(%)" : "(₹)"} *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder={formData.voucherType === "percent" ? "20" : "500"}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Min Spend (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 (No minimum)"
                  value={formData.minSpend}
                  onChange={(e) => setFormData({ ...formData, minSpend: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Validity</label>
                <select
                  value={formData.validityDays}
                  onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="15">15 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Occasion / Note</label>
              <input
                type="text"
                placeholder="e.g. Birthday Treat, Special VIP Perk"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.sendWhatsApp}
                  onChange={(e) => setFormData({ ...formData, sendWhatsApp: e.target.checked })}
                  className="w-3.5 h-3.5 text-amber-600 rounded"
                />
                <span>Send instant WhatsApp notification</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                {submitting ? "Issuing..." : "Confirm & Issue"}
              </button>
            </div>
          </form>
        )}

        {/* Vouchers List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading customer vouchers...</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
              <p className="text-sm font-semibold text-gray-700">No vouchers issued yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Click "Issue New" to give this customer a voucher.</p>
            </div>
          ) : (
            vouchers.map((v) => {
              const isExpired =
                v.status === "expired" ||
                (v.status === "active" &&
                  v.valid_until &&
                  v.valid_until < new Date().toISOString().split("T")[0]);

              return (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl border border-gray-100 bg-white hover:border-amber-200 transition-all shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200/50">
                        {v.code}
                      </span>
                      <button
                        onClick={() => handleCopy(v.code)}
                        title="Copy Code"
                        className="text-gray-400 hover:text-amber-600 transition-colors"
                      >
                        {copiedCode === v.code ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div>
                      {v.status === "redeemed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Redeemed
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Expired
                        </span>
                      ) : v.status === "cancelled" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          Cancelled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div>
                      <span className="font-bold text-emerald-700 text-sm">
                        {v.voucher_type === "percent"
                          ? `${Number(v.initial_value)}% OFF`
                          : `₹${Number(v.initial_value).toFixed(2)} OFF`}
                      </span>
                      {v.voucher_type === "cash" && (
                        <span className="ml-2 text-gray-500 text-[11px]">
                          (Balance: ₹{Number(v.balance_value).toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-400">
                      {v.valid_until ? `Valid until ${v.valid_until}` : "No expiry"}
                    </div>
                  </div>

                  {v.notes && <div className="text-[11px] text-gray-500 italic">{v.notes}</div>}

                  {/* Footer actions */}
                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">
                      Issued: {v.valid_from || v.created_at?.split("T")[0]}
                    </span>
                    <div className="flex items-center gap-2">
                      {customer.phone && (
                        <button
                          onClick={() => handleResend(v)}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium"
                        >
                          <Send className="w-3 h-3" /> Resend WhatsApp
                        </button>
                      )}
                      {v.status === "active" && !isExpired && (
                        <button
                          onClick={() => handleCancel(v.id)}
                          className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
                        >
                          <Ban className="w-3 h-3" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
