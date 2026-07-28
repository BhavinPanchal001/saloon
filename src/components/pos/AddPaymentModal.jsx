import { useState, useMemo } from "react";
import { X, CreditCard, DollarSign, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { addBillPaymentAPI } from "../../services/api";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import BankSelector from "../../modules/bank/components/BankSelector";

const paymentModes = ["Cash", "Card", "UPI", "Store Credit", "Split"];

export function AddPaymentModal({ bill, onClose, onSuccess }) {
  const toast = useToastStore();
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Existing paid amount and remaining due
  const { existingPaid, remainingDue } = useMemo(() => {
    if (!bill) return { existingPaid: 0, remainingDue: 0 };
    const total = Number(bill.total || 0);
    let paid = 0;
    (bill.payments || []).forEach((p) => {
      (p.details || []).forEach((d) => {
        paid += Number(d.amount || 0);
      });
    });
    return {
      existingPaid: paid,
      remainingDue: Math.max(0, Number((total - paid).toFixed(2))),
    };
  }, [bill]);

  const [paymentDetails, setPaymentDetails] = useState([
    { paymentMode: "cash", amount: remainingDue > 0 ? remainingDue : "", bankAccountId: "" },
  ]);

  if (!bill) return null;

  const paymentModeMap = { Cash: "cash", Card: "card", UPI: "upi", "Store Credit": "store_credit", Split: "split" };

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    if (method === "Split") {
      const half = Number((remainingDue / 2).toFixed(2));
      const rest = Number((remainingDue - half).toFixed(2));
      setPaymentDetails([
        { paymentMode: "cash", amount: half > 0 ? half : "", bankAccountId: "" },
        { paymentMode: "card", amount: rest > 0 ? rest : "", bankAccountId: "" },
      ]);
    } else {
      const mode = paymentModeMap[method] || "cash";
      setPaymentDetails([{ paymentMode: mode, amount: remainingDue > 0 ? remainingDue : "", bankAccountId: selectedBankId || "" }]);
    }
  };

  const addPaymentDetailRow = () => {
    if (paymentMethod !== "Split") {
      setPaymentMethod("Split");
    }
    const currentSum = paymentDetails.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const remaining = Math.max(0, Number((remainingDue - currentSum).toFixed(2)));
    setPaymentDetails((prev) => [
      ...prev,
      { paymentMode: "card", amount: remaining > 0 ? remaining : "", bankAccountId: "" },
    ]);
  };

  const removePaymentDetailRow = (idx) => {
    setPaymentDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePaymentDetail = (idx, field, value) => {
    setPaymentDetails((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  const totalAmountToPay = paymentDetails.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalAmountToPay <= 0) {
      toast.error("Please enter a valid payment amount greater than 0.");
      return;
    }

    const resolvedDetails = paymentDetails
      .map((d) => ({
        paymentMode: d.paymentMode,
        amount: Number(d.amount) || 0,
        bankAccountId: d.bankAccountId || null,
      }))
      .filter((d) => d.amount > 0);

    const nonCashMissingBank = resolvedDetails.some(
      (d) => d.paymentMode !== "cash" && d.paymentMode !== "store_credit" && !d.bankAccountId
    );
    if (nonCashMissingBank) {
      toast.error("Please select a bank account for all non-cash payment methods.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        paymentMethod,
        paymentDetails: resolvedDetails,
        bankAccountId: selectedBankId || null,
        transactionReference: transactionReference.trim() || undefined,
        paymentNotes: paymentNotes.trim() || undefined,
      };

      const res = await addBillPaymentAPI(bill.id, payload);
      toast.success(res.message || "Payment recorded successfully!");
      if (onSuccess) onSuccess(res.bill);
      onClose();
    } catch (err) {
      console.error("Failed to add payment:", err);
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy-900">Collect Payment</h3>
              <p className="text-xs font-semibold text-navy-400">Bill #{bill.billNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Due Summary Card */}
        <div className="rounded-2xl border border-navy-100 bg-navy-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-navy-600 font-semibold">
            <span>Customer</span>
            <span className="font-bold text-navy-900">{bill.customer?.name || "Walk-in Guest"}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-navy-600 font-semibold">
            <span>Bill Total</span>
            <span className="font-bold text-navy-900">{formatCurrency(bill.total)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-navy-600 font-semibold">
            <span>Already Paid</span>
            <span className="font-bold text-emerald-600">{formatCurrency(existingPaid)}</span>
          </div>
          <div className="border-t border-navy-100 pt-2 flex items-center justify-between text-sm font-black text-rose-600">
            <span>Remaining Due</span>
            <span className="text-base font-black">{formatCurrency(remainingDue)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selector */}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-navy-400">
              Payment Method
            </label>
            <div className="grid grid-cols-5 gap-1">
              {paymentModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleMethodChange(mode)}
                  className={`rounded-xl py-2 text-[9px] font-black uppercase tracking-wider transition ${
                    paymentMethod === mode
                      ? "bg-navy-900 text-white ring-2 ring-navy-300"
                      : "border border-navy-100 bg-white text-navy-600 hover:bg-navy-50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Breakdown Rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">
                Payment Details
              </span>
              <button
                type="button"
                onClick={addPaymentDetailRow}
                className="text-[10px] font-black uppercase tracking-widest text-gold-600 hover:text-gold-700"
              >
                + Add Method
              </button>
            </div>

            {paymentDetails.map((detail, idx) => (
              <div key={idx} className="space-y-1.5 rounded-xl border border-navy-100 bg-white p-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <select
                    value={detail.paymentMode}
                    onChange={(e) => updatePaymentDetail(idx, "paymentMode", e.target.value)}
                    className="flex-1 rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs font-semibold text-navy-700 focus:outline-none focus:border-navy-400"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount"
                    value={detail.amount}
                    onChange={(e) => updatePaymentDetail(idx, "amount", e.target.value)}
                    className="w-28 rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800 text-right focus:outline-none focus:border-navy-400"
                  />
                  {paymentDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentDetailRow(idx)}
                      className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {detail.paymentMode !== "cash" && (
                  <BankSelector
                    value={detail.bankAccountId || ""}
                    onChange={(v) => updatePaymentDetail(idx, "bankAccountId", v)}
                    label=""
                    required={false}
                    placeholder="Select bank account"
                    showDefaultIndicator={true}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Reference & Notes */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Transaction reference # (optional)"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 focus:outline-none focus:border-navy-400"
            />
            <input
              type="text"
              placeholder="Payment notes (optional)"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 focus:outline-none focus:border-navy-400"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting || totalAmountToPay <= 0}
            className="w-full btn-premium-primary py-3 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-black disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{submitting ? "Recording..." : `Record Payment (${formatCurrency(totalAmountToPay)})`}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
