import React from "react";
import { Printer, X } from "lucide-react";

export function ThermalReceiptModal({ bill, onClose }) {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between no-print">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" /> Receipt Preview
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div id="receipt-printable-area" className="p-4 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs text-slate-800 space-y-3">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-bold tracking-widest uppercase">GLOWY SALON</h2>
            <p className="text-[10px] text-slate-500">{bill.outletName || "Salon Outlet"}</p>
            <p className="text-[10px] text-slate-400">Bill #: {bill.billNumber}</p>
            <p className="text-[10px] text-slate-400">{new Date(bill.createdAt || Date.now()).toLocaleString()}</p>
          </div>

          <div className="border-t border-b border-dashed border-slate-300 py-1.5 space-y-1">
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-bold">{bill.customer?.name || bill.customer_name || "Walk-in"}</span>
            </div>
            {(bill.customer?.phone || bill.customer_phone) && (
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Phone:</span>
                <span>{bill.customer?.phone || bill.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-1.5 py-1">
            {bill.lineItems?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px]">
                <div className="flex-1 pr-2">
                  <span>{item.itemName}</span>
                  <div className="text-[9px] text-slate-400">{item.qty} x ₹{item.price}</div>
                </div>
                <span className="font-bold">₹{(item.qty * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{Number(bill.subtotal || 0).toFixed(2)}</span>
            </div>
            {Number(bill.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount</span>
                <span>-₹{Number(bill.discountAmount).toFixed(2)}</span>
              </div>
            )}
            {Number(bill.tax || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax / GST</span>
                <span>+₹{Number(bill.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300 text-slate-900">
              <span>TOTAL</span>
              <span>₹{Number(bill.total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
              <span>Payment Mode:</span>
              <span className="font-semibold uppercase">{bill.paymentMethod}</span>
            </div>
          </div>

          <div className="text-center pt-2 text-[10px] text-slate-400 italic">
            Thank you for visiting Glowy Salon!
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
