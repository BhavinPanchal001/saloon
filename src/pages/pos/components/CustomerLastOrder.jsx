import { useEffect, useState } from "react";
import { fetchCustomerLastOrderAPI } from "../../../services/api";
import { formatCurrency } from "../../../utils/format";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const quantityFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });

export function CustomerLastOrder({ customerId, outletId }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    fetchCustomerLastOrderAPI(customerId, { outletId, signal: request.signal })
      .then(({ order }) => {
        if (!request.signal.aborted) setResult({ order });
      })
      .catch(() => {
        if (!request.signal.aborted) setResult({ error: true });
      });
    return () => request.abort();
  }, [customerId, outletId, attempt]);

  const order = result?.order;

  return (
    <section aria-label="Last visit or purchase" className="space-y-1.5 rounded-xl border border-navy-200 bg-white p-2.5 text-xs text-navy-800">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <h3 className="font-semibold">Last visit or purchase</h3>
        {order && <time dateTime={order.createdAt}>{dateFormat.format(new Date(order.createdAt))}</time>}
      </div>
      {!result && <p role="status" className="text-slate-500">Loading last order…</p>}
      {result?.error && (
        <div className="flex flex-wrap items-center justify-between gap-x-2 text-rose-700">
          <p role="status">Couldn’t load the last order.</p>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setResult(null);
              setAttempt((current) => current + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {result && !result.error && !order && (
        <p role="status" className="text-slate-500">No completed orders in this billing view.</p>
      )}
      {order && (
        <>
          <p className="break-words text-slate-600">Bill {order.billNumber}{order.outletName && ` · ${order.outletName}`}</p>
          {order.lineItems.length > 0 ? (
            <ul aria-label="Purchased items" className="max-h-40 divide-y divide-navy-100 overflow-y-auto">
              {order.lineItems.map((item) => (
                <li key={item.id} className="py-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 break-words">
                      <span className="font-medium">{item.itemName}</span>
                      <span className="ml-1.5 capitalize text-slate-500">{item.itemType}</span>
                    </div>
                    <span className="shrink-0 tabular-nums">×{quantityFormat.format(item.qty)}</span>
                  </div>
                  {item.includedServices.length > 0 && (
                    <ul aria-label="Included services" className="ml-3 list-disc break-words pl-2 text-slate-600">
                      {item.includedServices.map((service, index) => (
                        <li key={index}>
                          {service.serviceName}
                          {service.sessions > 0 && ` · ${service.sessions} ${Number(service.sessions) === 1 ? "session" : "sessions"}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">Item details are unavailable.</p>
          )}
          <div className="flex justify-between gap-2 border-t border-navy-100 pt-1.5 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </>
      )}
    </section>
  );
}
