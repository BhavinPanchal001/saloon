import { X, Printer, Sparkles, MessageCircle } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { COMPANY_INFO } from "../../utils/companyInfo";
import { useEffect, useState } from "react";
import { fetchProductsFromAPI, sendWhatsAppBillAPI } from "../../services/api";
import { getUnitAbbr } from "../../utils/unitConversion";
import { useToastStore } from "../../stores/toastStore";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

import { createPortal } from "react-dom";

const typeLabel = (t) =>
  t === "service" ? "Service" : t === "package" ? "Package" : "Product";

export function InvoiceModal({ bill, onClose }) {
  const [productMasters, setProductMasters] = useState([]);
  const [sendingWa, setSendingWa] = useState(false);
  const toast = useToastStore();

  useEffect(() => {
    if (!bill) return;
    const needsProducts = bill.lineItems?.some(
      (item) => item.itemType === 'product'
    );
    if (!needsProducts) return;
    fetchProductsFromAPI().then(setProductMasters).catch(() => {});
  }, [bill]);

  if (!bill) return null;

  const handlePrint = () => window.print();

  const handleSendWhatsApp = async () => {
    if (!bill?.id) return;
    setSendingWa(true);
    try {
      const res = await sendWhatsAppBillAPI(bill.id);
      toast.success(res.message || "WhatsApp receipt sent successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to send WhatsApp message");
    } finally {
      setSendingWa(false);
    }
  };

  return createPortal(
    <div className="invoice-overlay" onClick={onClose}>
      <div className="invoice-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Screen-only action bar */}
        <div className="invoice-action-bar print-hide">
          <button onClick={handlePrint} className="btn-premium-primary text-xs !py-2.5 !px-5">
            <Printer size={15} /> Print / Save PDF
          </button>
          <button 
            onClick={handleSendWhatsApp} 
            disabled={sendingWa}
            className="btn-premium-secondary text-xs !py-2.5 !px-5 flex items-center gap-1.5 !bg-emerald-600 hover:!bg-emerald-700 !text-white transition-colors"
          >
            <MessageCircle size={15} /> {sendingWa ? "Sending..." : "Send WhatsApp"}
          </button>
          <button onClick={onClose} className="btn-premium-outline text-xs !py-2.5 !px-5">
            <X size={15} /> Close
          </button>
        </div>


        {/* Printable Invoice */}
        <div id="invoice-print-area" className="invoice-paper">
          {/* Header */}
          <header className="invoice-header">
            <div className="invoice-header-left">
              <img src="/glowy-logo.png" alt="Glowy" className="invoice-logo" />
              <div>
                <h1 className="invoice-brand">{COMPANY_INFO.name}</h1>
                <p className="invoice-tagline">{COMPANY_INFO.tagline}</p>
              </div>
            </div>
            <div className="invoice-header-right">
              <p className="invoice-company-detail">{COMPANY_INFO.address}</p>
              <p className="invoice-company-detail">{COMPANY_INFO.phone} · {COMPANY_INFO.email}</p>
              <p className="invoice-company-detail">GSTIN: {COMPANY_INFO.gstin}</p>
            </div>
          </header>

          <div className="invoice-gold-divider" />

          {/* Invoice Meta */}
          <div className="invoice-meta-row">
            <div>
              <h2 className="invoice-title">INVOICE</h2>
              <div className="invoice-status-badge" data-status={bill.status}>
                {bill.status === "paid" ? "✓ Paid" : bill.status === "partially_paid" ? "⚠ Partial" : bill.status === "unpaid" ? "✗ Unpaid" : "↩ Refunded"}
              </div>
            </div>
            <div className="invoice-meta-details">
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Invoice #</span>
                <span className="invoice-meta-value">{bill.billNumber}</span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Date</span>
                <span className="invoice-meta-value">{formatDate(bill.createdAt)}</span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Time</span>
                <span className="invoice-meta-value">{formatTime(bill.createdAt)}</span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Outlet</span>
                <span className="invoice-meta-value">{bill.outletName}</span>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="invoice-billto">
            <p className="invoice-billto-label">BILL TO</p>
            <p className="invoice-billto-name">{bill.customer?.name || "Walk-in Guest"}</p>
            {bill.customer?.phone && (
              <p className="invoice-billto-phone">{bill.customer.phone}</p>
            )}
          </div>

          {/* Line Items Table */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="invoice-th-num">#</th>
                <th>Item Description</th>
                <th>Type</th>
                <th className="invoice-th-right">Qty</th>
                <th className="invoice-th-right">Rate</th>
                <th className="invoice-th-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="invoice-td-num">{i + 1}</td>
                  <td className="invoice-td-name">{item.itemName}</td>
                  <td>
                    <span className="invoice-type-badge" data-type={item.itemType}>
                      {typeLabel(item.itemType)}
                    </span>
                  </td>
                  <td className="invoice-td-right">
                    {item.qty}
                    {(() => {
                      if (item.itemType === "product") {
                        const storedAbbr = item.productConsumption?.abbr;
                        if (storedAbbr) {
                          return <span className="text-[10px] text-slate-400 font-normal ml-0.5">{storedAbbr}</span>;
                        }
                        const product = productMasters.find((p) => String(p.id) === String(item.itemId));
                        const um = product?.unitMaster;
                        const unitRole = item.productConsumption?.unit || "primary";
                        const abbr = um ? (unitRole === "secondary" ? um.secondaryAbbr : um.primaryAbbr) : "";
                        return abbr ? <span className="text-[10px] text-slate-400 font-normal ml-0.5">{abbr}</span> : null;
                      }
                      return null;
                    })()}
                  </td>
                  <td className="invoice-td-right">{formatCurrency(item.price)}</td>
                  <td className="invoice-td-right invoice-td-amount">
                    {formatCurrency(item.price * item.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="invoice-totals">
            <div className="invoice-totals-row">
              <span>Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {bill.discountAmount > 0 && (
              <div className="invoice-totals-row text-emerald-600 font-semibold">
                <span>
                  Discount {bill.couponCode ? `(Coupon: ${bill.couponCode})` : bill.discountType === "percent" ? `(${bill.discountValue}%)` : "(Flat)"}
                </span>
                <span>− {formatCurrency(bill.discountAmount)}</span>
              </div>
            )}
            {(bill.points_redeemed || bill.pointsRedeemed) > 0 && (
              <div className="invoice-totals-row text-amber-700 font-semibold">
                <span>Points Redeemed ({bill.points_redeemed || bill.pointsRedeemed} Pts)</span>
                <span>− {formatCurrency(bill.points_discount_amount || bill.pointsDiscountAmount)}</span>
              </div>
            )}
            {(bill.points_earned || bill.pointsEarned) > 0 && (
              <div className="invoice-totals-row text-amber-600 font-medium">
                <span>Points Earned Today</span>
                <span>+{bill.points_earned || bill.pointsEarned} Pts</span>
              </div>
            )}
            <div className="invoice-totals-row">
              <span>Tax (8%)</span>
              <span>{formatCurrency(bill.tax)}</span>
            </div>
            <div className="invoice-gold-divider-sm" />
            <div className="invoice-totals-row invoice-grand-total">
              <span>Total Amount</span>
              <span>{formatCurrency(bill.total)}</span>
            </div>
            <div className="invoice-payment-method">
              Payment Method: <strong>{bill.paymentMethod}</strong>
              {bill.payments && bill.payments.length > 0 && bill.payments.some(p => (p.details || []).length > 1) && (
                <div className="mt-1.5 space-y-0.5 text-xs text-navy-700">
                  {bill.payments.flatMap(p => p.details || []).map((d, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span className="capitalize">{d.payment_mode || d.paymentMode}:</span>
                      <span className="font-semibold">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="invoice-footer">
            <div className="invoice-gold-divider" />
            <div className="invoice-footer-content">
              <div className="invoice-thankyou">
                <Sparkles size={16} className="invoice-sparkle" />
                <span>Thank you for choosing {COMPANY_INFO.name}!</span>
              </div>
              <p className="invoice-footer-msg">
                We hope you leave glowing. See you soon! 💖
              </p>
              <div className="invoice-footer-terms">
                <p>All services are non-refundable once rendered.</p>
                <p>This is a computer-generated invoice and does not require a signature.</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>,
    document.body
  );
}
