import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { saleReturnAPI } from "../../services/api";
import { formatCurrency } from "../../utils/format";

export function SaleReturnModal({ bill, onClose, onSuccess }) {
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [quote, setQuote] = useState(null);
  const [requestKey, setRequestKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const products = bill.lineItems.filter(line => bill.returnableQuantities[line.id] > 0);
  const items = products.filter(line => Number(quantities[line.id]) > 0)
    .map(line => ({ lineId: line.id, quantity: quantities[line.id] }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (quote) {
        const record = await saleReturnAPI(bill.id, { items, reason, reference, requestKey, quoteKey: quote.quoteKey });
        onSuccess(record);
      } else {
        const preview = await saleReturnAPI(bill.id, { items }, true);
        const key = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
        setRequestKey(key);
        setQuote(preview);
      }
    } catch (err) {
      setError(err.message || "Unable to process the return.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen title="Return products" size="lg" onClose={busy ? undefined : onClose} showCloseButton={!busy}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy || Boolean(quote)} className="space-y-4">
          <p className="text-sm text-navy-600">Return items from #{bill.billNumber}. The returned quantities go back into stock at {bill.outletName}.</p>
          {products.map(line => {
            const remaining = bill.returnableQuantities[line.id];
            const unit = line.productConsumption?.abbr;
            return (
              <label key={line.id} className="flex items-center justify-between gap-4 rounded-xl bg-navy-50 p-3">
                <span className="text-sm font-semibold text-navy-900">
                  {line.itemName}
                  <span className="block text-xs font-normal text-navy-600">{remaining} {unit || ""} available to return</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={remaining}
                  step="0.0001"
                  placeholder="0"
                  value={quantities[line.id] ?? ""}
                  onChange={event => setQuantities(current => ({ ...current, [line.id]: event.target.value }))}
                  className="w-28 rounded-lg border border-navy-200 bg-white p-2 text-right"
                  aria-label={`Quantity to return for ${line.itemName}, line ${line.id}`}
                />
              </label>
            );
          })}
          <label className="block text-sm font-semibold text-navy-900">
            Reason for return
            <textarea required maxLength={500} rows={2} value={reason} onChange={event => setReason(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-navy-200 p-2 font-normal" />
          </label>
        </fieldset>

        {quote && (
          <div className="space-y-3 rounded-xl border border-navy-200 p-4 text-sm text-navy-800">
            <div className="flex justify-between font-bold">
              <span>Total refund</span><span>{formatCurrency(Number(quote.amount))}</span>
            </div>
            {quote.refunds.map(payment => (
              <div key={`${payment.paymentMode}:${payment.bankAccountId}`} className="flex justify-between">
                <span>{payment.label}{payment.bankAccountId ? ` · Account #${payment.bankAccountId}` : ""}</span>
                <span>{formatCurrency(Number(payment.amount))}</span>
              </div>
            ))}
            {quote.refunds.some(payment => payment.paymentMode === "store_credit") && (
              <p>Store credit returns to the customer account when you record the return.</p>
            )}
            {quote.refunds.some(payment => payment.paymentMode !== "store_credit") && (
              <>
                <p>Record the return before issuing any external refunds. The saved return shows the final payment breakdown.</p>
                {quote.terminalName && quote.refunds.some(payment => payment.paymentMode === "cash") && (
                  <p>Cash drawer · {quote.terminalName}</p>
                )}
                <label className="block font-semibold">
                  Refund reference (optional)
                  <input value={reference} onChange={event => setReference(event.target.value)} maxLength={100} disabled={busy}
                    className="mt-1 block w-full rounded-lg border border-navy-200 p-2 font-normal" />
                </label>
              </>
            )}
          </div>
        )}

        {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-premium-outline" disabled={busy} onClick={() => {
            if (quote) { setQuote(null); setError(""); }
            else onClose();
          }}>{quote ? "Change return" : "Cancel"}</button>
          <button className="btn-premium-primary" disabled={busy || !items.length || !reason.trim()}>
            {busy ? "Please wait…" : quote ? "Record return" : "Review refund"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
