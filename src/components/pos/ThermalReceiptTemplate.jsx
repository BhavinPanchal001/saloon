import React, { useMemo } from "react";
import { COMPANY_INFO } from "../../utils/companyInfo";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const formatAmt = (val) => {
  const num = Number(val) || 0;
  return `RM ${num.toFixed(2)}`;
};

/**
 * Clean, high-contrast POS Thermal Receipt Template with RM (Malaysian Ringgit)
 * Perfectly scaled for 80mm (48 chars / ~300px) and 58mm (32 chars / ~220px) thermal printers.
 */
export function ThermalReceiptTemplate({ bill, paperWidth = 48, productMasters = [] }) {
  if (!bill) return null;

  const is58mm = Number(paperWidth) === 32 || String(paperWidth).includes("58");
  const lineItems = bill.lineItems || bill.line_items || [];

  const servedBy = useMemo(() => {
    if (bill.servedBy || bill.served_by || bill.staffName) {
      return bill.servedBy || bill.served_by || bill.staffName;
    }
    const talents = lineItems
      .map((item) => item.staffAssigned || item.staff_assigned || item.staffName)
      .filter(Boolean);
    const unique = [...new Set(talents)];
    return unique.length > 0 ? unique.join(", ") : null;
  }, [bill, lineItems]);

  return (
    <div
      id="thermal-receipt-print-area"
      className={`bg-white text-black font-mono select-none mx-auto print:mx-0 print:p-0 ${
        is58mm ? "w-[58mm] max-w-[58mm] text-[10px] p-2 leading-tight" : "w-[80mm] max-w-[80mm] text-[11px] p-3 leading-snug"
      }`}
      style={{
        fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
        color: "#000000",
        backgroundColor: "#ffffff",
      }}
    >
      {/* ─── Header ─── */}
      <div className="text-center pb-1 space-y-0.5">
        <h1 className={`${is58mm ? "text-sm" : "text-base"} font-black tracking-widest uppercase`}>
          {COMPANY_INFO.name || "GLOWY"}
        </h1>
        {COMPANY_INFO.tagline && (
          <p className="text-[9px] text-black/80 font-normal italic">{COMPANY_INFO.tagline}</p>
        )}
        {(bill.outlet?.address || bill.outletAddress || COMPANY_INFO.address) && (
          <p className="text-[9px] text-black/90 mt-0.5">
            {bill.outlet?.address || bill.outletAddress || COMPANY_INFO.address}
          </p>
        )}
        {(bill.outlet?.phone || bill.outletPhone || COMPANY_INFO.phone) && (
          <p className="text-[9px] text-black/90">
            Ph: {bill.outlet?.phone || bill.outletPhone || COMPANY_INFO.phone}
          </p>
        )}
        {(COMPANY_INFO.taxNumber || COMPANY_INFO.gstin) && (
          <p className="text-[9px] text-black/90">
            SST/Reg: {COMPANY_INFO.taxNumber || COMPANY_INFO.gstin}
          </p>
        )}
        {bill.outletName && (
          <p className="text-[9px] font-bold text-black uppercase mt-0.5">
            Outlet: {bill.outletName || bill.outlet_name}
          </p>
        )}
      </div>

      {/* ─── Dashed Separator ─── */}
      <div className="border-t border-dashed border-black my-1" />

      {/* ─── Receipt Metadata ─── */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Bill No:</span>
          <span className="font-bold">{bill.billNumber || bill.bill_number}</span>
        </div>
        <div className="flex justify-between">
          <span>Date & Time:</span>
          <span>
            {formatDate(bill.createdAt || bill.created_at)} {formatTime(bill.createdAt || bill.created_at)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span className="font-bold">{bill.customer?.name || bill.customer_name || "Walk-in Guest"}</span>
        </div>
        {(bill.customer?.phone || bill.customer_phone) && (
          <div className="flex justify-between">
            <span>Phone:</span>
            <span>{bill.customer?.phone || bill.customer_phone}</span>
          </div>
        )}
        {servedBy && (
          <div className="flex justify-between">
            <span>Served by:</span>
            <span className="font-bold">{servedBy}</span>
          </div>
        )}
      </div>

      {/* ─── Dashed Separator ─── */}
      <div className="border-t border-dashed border-black my-1" />

      {/* ─── Line Items Header ─── */}
      <div className="flex justify-between font-bold text-[10px] pb-0.5">
        <span className="w-5">#</span>
        <span className="flex-1 text-left">ITEM</span>
        <span className="w-10 text-right pr-2">QTY</span>
        <span className="w-24 text-right">AMOUNT</span>
      </div>
      <div className="border-t border-dashed border-black mb-1" />

      {/* ─── Line Items Rows ─── */}
      <div className="space-y-1">
        {lineItems.map((item, idx) => {
          const name = item.itemName || item.item_name || "Item";
          const qty = Number(item.qty || 1);
          const price = Number(item.price || 0);
          const amount = qty * price;
          const talent = item.staffAssigned || item.staff_assigned || item.staffName;

          // Unit abbr for products if available
          let unitAbbr = item.productConsumption?.abbr || "";
          if (!unitAbbr && item.itemType === "product" && productMasters?.length) {
            const product = productMasters.find((p) => String(p.id) === String(item.itemId));
            if (product?.unitMaster) {
              unitAbbr = product.unitMaster.primaryAbbr || "";
            }
          }

          return (
            <div key={idx} className="flex justify-between items-start text-[10px]">
              <span className="w-5 text-black/70">{idx + 1}.</span>
              <div className="flex-1 pr-1">
                <span className="font-semibold">{name}</span>
                {talent && (
                  <div className="text-[9px] text-black/80 font-medium">
                    Served by: {talent}
                  </div>
                )}
                {unitAbbr && (
                  <div className="text-[9px] text-black/70">
                    @ {formatAmt(price)}/{unitAbbr}
                  </div>
                )}
              </div>
              <span className="w-10 text-right pr-2">{qty}</span>
              <span className="w-24 text-right font-bold">{formatAmt(amount)}</span>
            </div>
          );
        })}
      </div>

      {/* ─── Dashed Separator ─── */}
      <div className="border-t border-dashed border-black my-1.5" />

      {/* ─── Totals Calculation ─── */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatAmt(bill.subtotal)}</span>
        </div>

        {Number(bill.discountAmount || bill.discount_amount || 0) > 0 && (
          <div className="flex justify-between font-medium">
            <span>
              Discount {bill.couponCode ? `(${bill.couponCode})` : ""}:
            </span>
            <span>- {formatAmt(bill.discountAmount || bill.discount_amount)}</span>
          </div>
        )}

        {(bill.points_redeemed || bill.pointsRedeemed) > 0 && (
          <div className="flex justify-between">
            <span>Points Redeemed ({bill.points_redeemed || bill.pointsRedeemed}):</span>
            <span>- {formatAmt(bill.points_discount_amount || bill.pointsDiscountAmount)}</span>
          </div>
        )}

        {Number(bill.tax || 0) > 0 && (
          <div className="flex justify-between">
            <span>Tax (GST 8%):</span>
            <span>{formatAmt(bill.tax)}</span>
          </div>
        )}
      </div>

      {/* ─── Double Line Grand Total ─── */}
      <div className="border-t-2 border-b-2 border-black my-1 py-1 flex justify-between items-center">
        <span className={`${is58mm ? "text-xs" : "text-sm"} font-black uppercase`}>TOTAL:</span>
        <span className={`${is58mm ? "text-xs" : "text-base"} font-black`}>
          {formatAmt(bill.total)}
        </span>
      </div>

      {/* ─── Payment Details ─── */}
      <div className="space-y-0.5 text-[9.5px]">
        <div className="flex justify-between">
          <span>Payment Method:</span>
          <span className="font-bold uppercase">{bill.paymentMethod || bill.payment_method || "CASH"}</span>
        </div>

        {bill.payments && bill.payments.length > 0 && (
          <div className="pl-1 text-[9px] text-black/80 space-y-0.5">
            {bill.payments.flatMap((p) => p.details || []).map((d, i) => (
              <div key={i} className="flex justify-between">
                <span className="capitalize">{d.payment_mode || d.paymentMode}:</span>
                <span>{formatAmt(d.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {(bill.points_earned || bill.pointsEarned) > 0 && (
          <div className="flex justify-between font-semibold pt-0.5">
            <span>Points Earned Today:</span>
            <span>+{bill.points_earned || bill.pointsEarned} pts</span>
          </div>
        )}
      </div>

      {/* ─── Footer & Barcode/Thank You ─── */}
      <div className="border-t border-dashed border-black my-1.5 pt-1 text-center space-y-1">
        <p className="font-bold text-[10px] uppercase">
          {COMPANY_INFO.receiptFooter || "THANK YOU FOR YOUR VISIT!"}
        </p>
        <p className="text-[8px] text-black/60 pt-0.5">
          {COMPANY_INFO.terms || "Services and products once rendered/sold are non-refundable. Computer generated invoice."}
        </p>
      </div>
    </div>
  );
}
