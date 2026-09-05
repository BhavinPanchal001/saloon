import { useEffect, useState } from "react";
import { X, Calendar, User, MapPin, Package, Scissors, CreditCard, Info, MessageCircle } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { createPortal } from "react-dom";
import { getUnitAbbr } from "../../utils/unitConversion";
import { fetchProductsFromAPI, sendWhatsAppBillAPI } from "../../services/api";
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

export function BillDetailModal({ bill, onClose }) {
  const [productMasters, setProductMasters] = useState([]);
  const [sendingWa, setSendingWa] = useState(false);
  const toast = useToastStore();

  useEffect(() => {
    if (!bill) return;
    const needsProducts = bill.lineItems?.some(
      (item) => item.itemType === 'product' || (item.itemType === 'service' && item.productConsumption?.length > 0)
    );
    if (!needsProducts) return;
    fetchProductsFromAPI().then(setProductMasters).catch(() => {});
  }, [bill]);

  if (!bill) return null;

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-sm">
      <div className="card-solid w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-50 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-navy-900">Bill Details</h2>
              <span className={`status-badge ${bill.status === "paid" ? "status-active" : "status-danger"}`}>
                {bill.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">View complete transaction and consumption logs.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWa}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              title="Send WhatsApp Receipt"
            >
              <MessageCircle size={16} />
              {sendingWa ? "Sending..." : "Send WhatsApp"}
            </button>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-100 bg-white text-navy-400 hover:bg-navy-50 hover:text-navy-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>


        <div className="mt-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="glass-card !p-4 bg-navy-50/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3">Transaction Info</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <Info size={14} className="text-navy-400" />
                  <span className="font-bold text-navy-900">#{bill.billNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={14} className="text-navy-400" />
                  <span className="text-navy-700">{formatDate(bill.createdAt)} at {formatTime(bill.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={14} className="text-navy-400" />
                  <span className="text-navy-700">{bill.outletName}</span>
                </div>
                {(() => {
                  const servedBy = bill.servedBy || bill.served_by || bill.staffName || [
                    ...new Set((bill.lineItems || []).map((it) => it.staffAssigned || it.staff_assigned).filter(Boolean)),
                  ].join(', ');
                  if (!servedBy) return null;
                  return (
                    <div className="flex items-center gap-3 text-sm">
                      <Sparkles size={14} className="text-amber-500" />
                      <span className="text-navy-700">Served by <strong className="text-navy-900">{servedBy}</strong></span>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="glass-card !p-4 bg-navy-50/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3">Customer Info</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <User size={14} className="text-navy-400" />
                  <span className="font-bold text-navy-900">{bill.customer?.name || "Walk-in Guest"}</span>
                </div>
                {bill.customer?.phone && (
                  <div className="flex items-center gap-3 text-sm pl-6">
                    <span className="text-navy-700">{bill.customer.phone}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-3">
                    <CreditCard size={14} className="text-navy-400" />
                    <span className="text-navy-700">Paid via {bill.paymentMethod}</span>
                  </div>
                  {bill.payments && bill.payments.length > 0 && bill.payments.some(p => (p.details || []).length > 0) && (
                    <div className="pl-6 space-y-0.5 text-xs text-navy-600">
                      {bill.payments.flatMap(p => p.details || []).map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="capitalize">{d.payment_mode || d.paymentMode}:</span>
                          <span className="font-semibold">{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-4">Items & Services</p>
            <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-navy-50/50 border-b border-navy-100">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Item</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Served By</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-center">Qty</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {bill.lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.itemType === 'service' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                            {item.itemType === 'service' ? <Scissors size={14} /> : <Package size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-navy-900">{item.itemName}</p>
                            {item.staffAssigned && (
                              <p className="text-xs text-slate-500 font-medium sm:hidden">
                                Served by: {item.staffAssigned}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {item.staffAssigned ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            {item.staffAssigned}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-bold text-navy-900">
                          {item.qty}
                          {(() => {
                            if (item.itemType === "product") {
                              const storedAbbr = item.productConsumption?.abbr;
                              if (storedAbbr) {
                                return <span className="text-xs text-slate-400 font-normal ml-1">{storedAbbr}</span>;
                              }
                              const product = productMasters.find((p) => String(p.id) === String(item.itemId));
                              const um = product?.unitMaster;
                              const unitRole = item.productConsumption?.unit || "primary";
                              const abbr = um ? (unitRole === "secondary" ? um.secondaryAbbr : um.primaryAbbr) : "";
                              return abbr ? <span className="text-xs text-slate-400 font-normal ml-1">{abbr}</span> : null;
                            }
                            return null;
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-black text-navy-900">{formatCurrency(item.price * item.qty)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Consumption Details */}
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-4">Inventory Consumption Log</p>
            <div className="space-y-4">
              {bill.lineItems.filter(item => item.itemType === 'service' && item.productConsumption?.length > 0).map((item, idx) => (
                <div key={idx} className="glass-card !p-0 overflow-hidden border-purple-100">
                  <div className="bg-purple-50/50 px-4 py-2 border-b border-purple-100">
                    <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Usage for: {item.itemName}</p>
                  </div>
                  <div className="p-4 grid gap-3">
                    {item.productConsumption.map((consumption, cIdx) => {
                      const product = productMasters.find(p => p.id === consumption.productId);
                      const um = product?.unitMaster;
                      const unitAbbr = um ? getUnitAbbr(um, consumption.unit || 'primary') : '';
                      const productSize = product?.productMeasureLabel || '';

                      return (
                        <div key={cIdx} className="flex items-center justify-between border-b border-navy-50 last:border-0 pb-2 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                            <div>
                              <p className="text-sm font-bold text-navy-900">{product?.itemName || consumption.productId}</p>
                              {productSize && <p className="text-[10px] text-slate-400 font-medium">Pack Size: {productSize}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-navy-900">{consumption.qty} {unitAbbr}</span>
                            <p className="text-[10px] text-slate-400 font-medium">consumed</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {bill.lineItems.filter(item => item.itemType === 'service' && item.productConsumption?.length > 0).length === 0 && (
                <div className="rounded-2xl border border-dashed border-navy-200 p-8 text-center">
                  <p className="text-xs text-slate-400 italic">No specific inventory consumption recorded for this transaction.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Totals Footer */}
        <div className="mt-4 rounded-3xl bg-navy-900 p-6 text-white shadow-2xl shadow-navy-900/20">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Subtotal</p>
                <p className="mt-1 font-bold">{formatCurrency(bill.subtotal)}</p>
              </div>
              {bill.discountAmount > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Discount</p>
                  <p className="mt-1 font-bold text-gold-400">−{formatCurrency(bill.discountAmount)}</p>
                </div>
              )}
              {Number(bill.voucherDiscountAmount || bill.voucher_discount_amount || 0) > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Voucher</p>
                  <p className="mt-1 font-bold text-gold-400">−{formatCurrency(bill.voucherDiscountAmount || bill.voucher_discount_amount)}</p>
                </div>
              )}
              {(bill.awardedVoucherCode || bill.awarded_voucher_code) && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Awarded Voucher</p>
                  <p className="mt-1 font-bold text-emerald-300">
                    +{formatCurrency(bill.awardedVoucherAmount || bill.awarded_voucher_amount || 0)}
                    <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200">
                      {bill.awardedVoucherCode || bill.awarded_voucher_code}
                    </span>
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Tax (8%)</p>
                <p className="mt-1 font-bold">{formatCurrency(bill.tax)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gold-400">Total Charged</p>
              <p className="mt-1 text-3xl font-black text-white">{formatCurrency(bill.total)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
