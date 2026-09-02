import { X, Printer, Sparkles, MessageCircle, Bluetooth, FileText, Receipt, Check, Loader2, RefreshCw } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { COMPANY_INFO } from "../../utils/companyInfo";
import { useEffect, useState } from "react";
import { fetchProductsFromAPI, sendWhatsAppBillAPI } from "../../services/api";
import { useToastStore } from "../../stores/toastStore";
import { createPortal } from "react-dom";
import { ThermalReceiptTemplate } from "../../components/pos/ThermalReceiptTemplate";
import {
  getBluetoothPrinterStatus,
  connectBluetoothPrinter,
  autoReconnectBluetoothPrinter,
  printBluetoothReceipt,
  onPrinterStateChange,
} from "../../utils/bluetoothPrinter";

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

const typeLabel = (t) =>
  t === "service" ? "Service" : t === "package" ? "Package" : "Product";

export function InvoiceModal({ bill, onClose, defaultTemplate }) {
  const [productMasters, setProductMasters] = useState([]);
  const [sendingWa, setSendingWa] = useState(false);
  const [waDeliveryStatus, setWaDeliveryStatus] = useState(() => bill?.whatsapp || null);
  const toast = useToastStore();

  // Template selection: 'thermal' | 'a4'
  const [templateMode, setTemplateMode] = useState(() => {
    return defaultTemplate || localStorage.getItem("glowy_print_template") || "thermal";
  });

  // Paper roll width: 48 (80mm) | 32 (58mm)
  const [paperWidth, setPaperWidth] = useState(() => {
    return localStorage.getItem("glowy_printer_paper_width") ? parseInt(localStorage.getItem("glowy_printer_paper_width"), 10) : 48;
  });

  // Bluetooth state
  const [btStatus, setBtStatus] = useState(getBluetoothPrinterStatus());
  const [printingBt, setPrintingBt] = useState(false);
  const [connectingBt, setConnectingBt] = useState(false);

  useEffect(() => {
    const unsub = onPrinterStateChange((status) => {
      setBtStatus(status);
    });
    autoReconnectBluetoothPrinter().catch(() => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!bill) return;
    const needsProducts = bill.lineItems?.some((item) => item.itemType === "product");
    if (!needsProducts) return;
    fetchProductsFromAPI().then(setProductMasters).catch(() => {});
  }, [bill]);

  const handleTemplateChange = (mode) => {
    setTemplateMode(mode);
    localStorage.setItem("glowy_print_template", mode);
  };

  const handlePaperWidthChange = (width) => {
    setPaperWidth(width);
    localStorage.setItem("glowy_printer_paper_width", String(width));
  };

  const handlePrint = () => {
    if (templateMode === "thermal") {
      document.body.classList.add("thermal-print-mode");
      if (paperWidth === 32) document.body.classList.add("thermal-print-mode-58");
    }
    window.print();
    setTimeout(() => {
      document.body.classList.remove("thermal-print-mode", "thermal-print-mode-58");
    }, 500);
  };

  const handlePrintBluetooth = async () => {
    setPrintingBt(true);
    try {
      if (!btStatus.connected) {
        setConnectingBt(true);
        const reconnected = await autoReconnectBluetoothPrinter();
        if (!reconnected) {
          await connectBluetoothPrinter();
        }
        setConnectingBt(false);
      }
      const res = await printBluetoothReceipt(bill, { paperWidth });
      toast.success(res.message || "Thermal receipt printed via Bluetooth!");
    } catch (err) {
      if (err.name !== "NotFoundError" && !err.message?.includes("User cancelled")) {
        toast.error(err.message || "Bluetooth print failed. Falling back to browser print...");
        handlePrint();
      }
    } finally {
      setPrintingBt(false);
      setConnectingBt(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!bill?.id) return;
    setSendingWa(true);
    try {
      const res = await sendWhatsAppBillAPI(bill.id);
      const delivery = res.result || { success: true, message: res.message };
      setWaDeliveryStatus(delivery);
      toast.success(res.message || "WhatsApp receipt sent successfully!");
    } catch (err) {
      setWaDeliveryStatus({ success: false, error: err.message || "Failed to send WhatsApp message" });
      toast.error(err.message || "Failed to send WhatsApp message");
    } finally {
      setSendingWa(false);
    }
  };

  if (!bill) return null;

  return createPortal(
    <div className="invoice-overlay" onClick={onClose}>
      <div
        className={`invoice-modal-wrapper ${
          templateMode === "thermal" ? "max-w-md" : "max-w-3xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Template Switcher & Screen Action Bar ─── */}
        <div className="invoice-action-bar print-hide flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 text-white rounded-2xl mb-4 backdrop-blur shadow-xl border border-slate-700/50">
          {/* Format Selector Pills */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => handleTemplateChange("thermal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                templateMode === "thermal"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Receipt size={14} /> Thermal POS (80/58mm)
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange("a4")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                templateMode === "a4"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileText size={14} /> A4 Tax Invoice
            </button>
          </div>

          {/* Roll Size (Only in Thermal mode) */}
          {templateMode === "thermal" && (
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-[11px] font-semibold text-slate-300">
              <button
                type="button"
                onClick={() => handlePaperWidthChange(48)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperWidth === 48 ? "bg-slate-700 text-white font-bold" : "hover:text-white"
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => handlePaperWidthChange(32)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperWidth === 32 ? "bg-slate-700 text-white font-bold" : "hover:text-white"
                }`}
              >
                58mm
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {templateMode === "thermal" ? (
              <>
                <button
                  type="button"
                  onClick={handlePrintBluetooth}
                  disabled={printingBt || connectingBt}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md disabled:opacity-50 transition-all"
                  title="Direct print to wireless Bluetooth thermal printer"
                >
                  {printingBt ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Printing...
                    </>
                  ) : (
                    <>
                      <Bluetooth size={14} />
                      {btStatus.connected ? "Print Bluetooth" : "Connect & Print (BT)"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
                  title="Print using system print dialog"
                >
                  <Printer size={14} /> Browser Print
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                className="btn-premium-primary text-xs !py-2 !px-4 flex items-center gap-1.5"
              >
                <Printer size={14} /> Print / Save PDF (A4)
              </button>
            )}

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={sendingWa}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
            >
              <MessageCircle size={14} /> {sendingWa ? "Sending..." : "WhatsApp"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── WhatsApp Delivery Status Alert ─── */}
        {waDeliveryStatus && !waDeliveryStatus.skipped && (
          <div className="print-hide mb-4">
            {waDeliveryStatus.success ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-200 text-xs font-medium backdrop-blur shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    WhatsApp: <strong>Invoice sent successfully</strong>
                    {waDeliveryStatus.provider ? ` via ${waDeliveryStatus.provider === 'baileys' ? 'Baileys' : 'WhatsApp Business API'}` : ''}
                    {waDeliveryStatus.recipient ? ` to ${waDeliveryStatus.recipient}` : ''}
                    {waDeliveryStatus.simulated ? ' (Simulation Mode)' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={sendingWa}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 text-[11px] font-bold transition-all"
                >
                  {sendingWa ? 'Sending...' : 'Resend'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-rose-950/80 border border-rose-500/30 text-rose-200 text-xs font-medium backdrop-blur shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span>
                    WhatsApp: <strong>Failed to send invoice</strong> — {waDeliveryStatus.reason || waDeliveryStatus.error || 'Delivery failed'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={sendingWa}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow transition-all flex items-center gap-1"
                >
                  <RefreshCw size={12} className={sendingWa ? 'animate-spin' : ''} />
                  {sendingWa ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Printable Content Area ─── */}
        {templateMode === "thermal" ? (
          /* POS Thermal Receipt Template View */
          <div className="bg-slate-100 p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-inner flex justify-center overflow-x-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80">
              <ThermalReceiptTemplate
                bill={bill}
                paperWidth={paperWidth}
                productMasters={productMasters}
              />
            </div>
          </div>
        ) : (
          /* A4 Tax Invoice Template View */
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
                <p className="invoice-company-detail">
                  {COMPANY_INFO.phone} · {COMPANY_INFO.email}
                </p>
                <p className="invoice-company-detail">
                  {COMPANY_INFO.taxNumber ? `SST/Reg: ${COMPANY_INFO.taxNumber}` : COMPANY_INFO.gstin ? `GSTIN: ${COMPANY_INFO.gstin}` : ''}
                </p>
              </div>
            </header>

            <div className="invoice-gold-divider" />

            {/* Invoice Meta */}
            <div className="invoice-meta-row">
              <div>
                <h2 className="invoice-title">TAX INVOICE</h2>
                <div className="invoice-status-badge" data-status={bill.status}>
                  {bill.status === "paid"
                    ? "✓ Paid"
                    : bill.status === "partially_paid"
                    ? "⚠ Partial"
                    : bill.status === "unpaid"
                    ? "✗ Unpaid"
                    : "↩ Refunded"}
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
                {(() => {
                  const servedBy = bill.servedBy || bill.served_by || bill.staffName || [
                    ...new Set(
                      (bill.lineItems || [])
                        .map((it) => it.staffAssigned || it.staff_assigned || it.staffName)
                        .filter(Boolean)
                    ),
                  ].join(', ');
                  if (!servedBy) return null;
                  return (
                    <div className="invoice-meta-item">
                      <span className="invoice-meta-label">Served by</span>
                      <span className="invoice-meta-value font-bold text-indigo-700">{servedBy}</span>
                    </div>
                  );
                })()}
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
                {bill.lineItems.map((item, i) => {
                  const talent = item.staffAssigned || item.staff_assigned || item.staffName;
                  return (
                    <tr key={i}>
                      <td className="invoice-td-num">{i + 1}</td>
                      <td className="invoice-td-name">
                        <div className="font-semibold">{item.itemName}</div>
                        {talent && (
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Served by: <span className="text-slate-800 font-bold">{talent}</span>
                          </div>
                        )}
                      </td>
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
                            return (
                              <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                                {storedAbbr}
                              </span>
                            );
                          }
                          const product = productMasters.find(
                            (p) => String(p.id) === String(item.itemId)
                          );
                          const um = product?.unitMaster;
                          const unitRole = item.productConsumption?.unit || "primary";
                          const abbr = um
                            ? unitRole === "secondary"
                              ? um.secondaryAbbr
                              : um.primaryAbbr
                            : "";
                          return abbr ? (
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                              {abbr}
                            </span>
                          ) : null;
                        }
                        return null;
                      })()}
                    </td>
                    <td className="invoice-td-right">{formatCurrency(item.price)}</td>
                    <td className="invoice-td-right invoice-td-amount">
                      {formatCurrency(item.price * item.qty)}
                    </td>
                    </tr>
                  );
                })}
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
                    Discount{" "}
                    {bill.couponCode
                      ? `(Coupon: ${bill.couponCode})`
                      : bill.discountType === "percent"
                      ? `(${bill.discountValue}%)`
                      : "(Flat)"}
                  </span>
                  <span>− {formatCurrency(bill.discountAmount)}</span>
                </div>
              )}
              {(bill.points_redeemed || bill.pointsRedeemed) > 0 && (
                <div className="invoice-totals-row text-amber-700 font-semibold">
                  <span>
                    Points Redeemed ({bill.points_redeemed || bill.pointsRedeemed} Pts)
                  </span>
                  <span>
                    − {formatCurrency(bill.points_discount_amount || bill.pointsDiscountAmount)}
                  </span>
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
                {bill.payments &&
                  bill.payments.length > 0 &&
                  bill.payments.some((p) => (p.details || []).length > 1) && (
                    <div className="mt-1.5 space-y-0.5 text-xs text-navy-700">
                      {bill.payments
                        .flatMap((p) => p.details || [])
                        .map((d, i) => (
                          <div key={i} className="flex justify-between gap-4">
                            <span className="capitalize">
                              {d.payment_mode || d.paymentMode}:
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(d.amount)}
                            </span>
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
                <p className="invoice-footer-msg">We hope you leave glowing. See you soon! 💖</p>
                <div className="invoice-footer-terms">
                  {COMPANY_INFO.terms ? (
                    <div className="whitespace-pre-line text-xs text-slate-500">
                      {COMPANY_INFO.terms}
                    </div>
                  ) : (
                    <>
                      <p>All services are non-refundable once rendered.</p>
                      <p>This is a computer-generated invoice and does not require a signature.</p>
                    </>
                  )}
                </div>
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
