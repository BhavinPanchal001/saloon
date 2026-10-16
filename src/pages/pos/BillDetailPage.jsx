import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  Package, 
  Scissors, 
  CreditCard, 
  Info, 
  Banknote, 
  Printer, 
  Edit, 
  MessageCircle,
  Gift,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { formatCurrency } from "../../utils/format";
import { getUnitAbbr } from "../../utils/unitConversion";
import { fetchBillByIdFromAPI, fetchProductsFromAPI, sendWhatsAppBillAPI } from "../../services/api";
import { ThermalReceiptModal } from "../../components/pos/ThermalReceiptModal";
import { AddPaymentModal } from "../../components/pos/AddPaymentModal";
import { EditInvoiceModal } from "./EditInvoiceModal";
import { useToastStore } from "../../stores/toastStore";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export default function BillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToastStore();
  const [bill, setBill] = useState(null);
  const [productMasters, setProductMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);

  const handleSendWhatsApp = async () => {
    if (!bill?.id) return;
    setSendingWa(true);
    try {
      const template = localStorage.getItem("glowy_print_template") || "thermal";
      const paperWidth = localStorage.getItem("glowy_printer_paper_width") ? parseInt(localStorage.getItem("glowy_printer_paper_width"), 10) : 48;
      const res = await sendWhatsAppBillAPI(bill.id, { format: template, paperWidth });
      toast.success(res.message || "WhatsApp receipt sent successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to send WhatsApp message");
    } finally {
      setSendingWa(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, products] = await Promise.all([
          fetchBillByIdFromAPI(id),
          fetchProductsFromAPI(),
        ]);
        setBill(data);
        setProductMasters(products);
      } catch (err) {
        setError(err.message || "Failed to load bill.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-navy-800 transition-colors">
          <ArrowLeft size={16} /> Back to Billing History
        </button>
        <div className="glass-card p-10 text-center text-sm text-red-600">{error || "Bill not found."}</div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-navy-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Billing History
      </button>

      <PageHeader
        eyebrow="POS · Bill"
        title={`#${bill.billNumber}`}
        description={`${formatDate(bill.createdAt)} at ${formatTime(bill.createdAt)} · ${bill.outletName}`}
      >
        <div className="flex items-center gap-3">
          <span className={`status-badge text-sm px-4 py-1.5 ${
            bill.status === "paid" ? "status-active" : bill.status === "partially_paid" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-rose-100 text-rose-800 border border-rose-200"
          }`}>
            {bill.status === "partially_paid" ? "Partial" : bill.status === "unpaid" ? "Unpaid" : bill.status}
          </span>
          <button
            onClick={() => setShowReceiptModal(true)}
            className="btn-premium-outline !py-2 !px-4 text-xs flex items-center gap-2"
          >
            <Printer size={14} /> Print Receipt
          </button>
          <button
            onClick={handleSendWhatsApp}
            disabled={sendingWa}
            className="btn-premium-secondary !py-2 !px-4 text-xs flex items-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 !text-white transition-colors"
          >
            <MessageCircle size={14} /> {sendingWa ? "Sending..." : "Send WhatsApp"}
          </button>
          <button
            onClick={() => navigate(`/pos?editBillId=${bill.id}`, { state: { editBill: bill } })}
            className="btn-premium-outline !py-2 !px-4 text-xs flex items-center gap-2"
          >
            <Edit size={14} /> Edit Invoice in POS
          </button>
          {bill.status !== "paid" && (
            <button
              onClick={() => setShowAddPayment(true)}
              className="btn-premium-primary !py-2 !px-4 text-xs flex items-center gap-2"
            >
              <CreditCard size={14} /> + Collect Payment
            </button>
          )}
        </div>
      </PageHeader>


      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2">
        <div className="glass-card !p-5 bg-navy-50/30">
          <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-4">Transaction Info</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Info size={15} className="text-navy-400 flex-shrink-0" />
              <span className="font-bold text-navy-900">#{bill.billNumber}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={15} className="text-navy-400 flex-shrink-0" />
              <span className="text-navy-700">{formatDate(bill.createdAt)} at {formatTime(bill.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={15} className="text-navy-400 flex-shrink-0" />
              <span className="text-navy-700">{bill.outletName}</span>
            </div>
          </div>
        </div>
        <div className="glass-card !p-5 bg-navy-50/30">
          <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-4">Customer Info</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User size={15} className="text-navy-400 flex-shrink-0" />
              <span className="font-bold text-navy-900">{bill.customer?.name || "Walk-in Guest"}</span>
            </div>
            {bill.customer?.phone && (
              <div className="flex items-center gap-3 text-sm pl-6">
                <span className="text-navy-700">{bill.customer.phone}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-3">
                <CreditCard size={15} className="text-navy-400 flex-shrink-0" />
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

      {/* Awarded Next-Visit Voucher Section */}
      {(() => {
        const awardedVoucher = bill.awardedVoucher || (bill.awardedVoucherCode ? {
          code: bill.awardedVoucherCode,
          amount: bill.awardedVoucherAmount,
          initialValue: bill.awardedVoucherAmount,
          status: 'active',
        } : null);

        if (!awardedVoucher || (!awardedVoucher.code && !awardedVoucher.amount)) return null;

        return (
          <div className="mb-8 overflow-hidden rounded-3xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 p-6 shadow-xl shadow-amber-500/5 transition-all">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-amber-200/80 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20 flex-shrink-0">
                  <Gift size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight text-navy-900 sm:text-lg">
                      Next-Visit Reward Voucher
                    </h3>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 border border-amber-300">
                      Reward
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Earned by customer from this invoice · Redeemable on their next appointment
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {awardedVoucher.status === "redeemed" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-200">
                    <CheckCircle2 size={13} className="text-blue-600" />
                    Redeemed
                    {awardedVoucher.redeemedBillNumber && ` on Bill #${awardedVoucher.redeemedBillNumber}`}
                  </span>
                ) : awardedVoucher.status === "expired" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 border border-rose-200">
                    <AlertCircle size={13} className="text-rose-600" />
                    Expired
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                    <Sparkles size={13} className="text-emerald-500" />
                    Active · Ready for Next Visit
                  </span>
                )}
              </div>
            </div>

            {/* Voucher Details Grid */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Voucher Code */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voucher Code</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-black tracking-wider text-amber-950 sm:text-lg">
                    {awardedVoucher.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(awardedVoucher.code);
                      setCopiedCode(true);
                      toast.success(`Copied voucher code ${awardedVoucher.code}`);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      copiedCode
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100/70 text-amber-900 hover:bg-amber-900 hover:text-white"
                    }`}
                    title="Copy Voucher Code"
                  >
                    {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedCode ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Voucher Discount Value */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reward Value</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-amber-600">
                    {formatCurrency(awardedVoucher.initialValue || awardedVoucher.amount || 0)}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800/80">OFF</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 capitalize">
                  {awardedVoucher.voucherType || "Cash"} Discount
                  {awardedVoucher.balanceValue !== undefined && Number(awardedVoucher.balanceValue) !== Number(awardedVoucher.initialValue) && (
                    <span className="ml-1 text-navy-600 font-semibold">(Balance: {formatCurrency(awardedVoucher.balanceValue)})</span>
                  )}
                </p>
              </div>

              {/* Validity Period */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Validity Period</p>
                <div className="mt-1.5 space-y-0.5 text-xs text-navy-800 font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-600 font-normal">
                    <span>From:</span> <strong className="text-navy-900 font-semibold">{formatDate(awardedVoucher.validFrom || bill.createdAt)}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 font-normal">
                    <span>Until:</span> <strong className="text-navy-900 font-semibold">{formatDate(awardedVoucher.validUntil)}</strong>
                  </div>
                </div>
                {awardedVoucher.validUntil && (
                  <div className="mt-1.5 text-[10px] font-bold text-amber-700 flex items-center gap-1">
                    <Clock size={11} />
                    {(() => {
                      const diffDays = Math.ceil((new Date(awardedVoucher.validUntil) - new Date()) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) return "Expired";
                      if (diffDays === 0) return "Expires today";
                      return `Valid for ${diffDays} more day${diffDays > 1 ? "s" : ""}`;
                    })()}
                  </div>
                )}
              </div>

              {/* Minimum Spend & Conditions */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Redemption Rules</p>
                <div className="mt-1 text-sm font-bold text-navy-900">
                  {Number(awardedVoucher.minSpend || 0) > 0 ? (
                    <span>Min. Spend {formatCurrency(awardedVoucher.minSpend)}</span>
                  ) : (
                    <span className="text-emerald-700">No min spend required</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Valid on any service or product in next visit
                </p>
              </div>
            </div>

            {/* Sub-row with redemption notes or links */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-200/60 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-amber-500" />
                <span>
                  {awardedVoucher.notes || `Auto-awarded based on bill total ${formatCurrency(bill.total)}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {awardedVoucher.redeemedBillId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/pos/bills/${awardedVoucher.redeemedBillId}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink size={12} />
                    View Redeemed Bill #{awardedVoucher.redeemedBillNumber || awardedVoucher.redeemedBillId}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/vouchers?search=${encodeURIComponent(awardedVoucher.code)}`)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors"
                >
                  <ExternalLink size={12} />
                  Manage in Vouchers
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Line Items — with inline product consumption */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-4">Items & Services</p>
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 border-b border-navy-100">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Item</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Served By</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-center">Qty</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {bill.lineItems.map((item, idx) => (
                <tr key={`item-${idx}`} className="bg-white">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                        item.itemType === "service"
                          ? "bg-purple-50 text-purple-600"
                          : item.itemType === "package"
                          ? "bg-gold-50 text-gold-600"
                          : "bg-blue-50 text-blue-600"
                      }`}>
                        {item.itemType === "service" ? <Scissors size={14} /> : <Package size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-navy-900">{item.itemName}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{item.itemType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {item.staffAssigned ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        {item.staffAssigned}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
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
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-black text-navy-900">{formatCurrency(item.price * item.qty)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Footer */}
      <div className="rounded-3xl bg-navy-900 p-6 text-white shadow-2xl shadow-navy-900/20">
        <div className="flex flex-wrap justify-between items-center gap-6">
          <div className="flex gap-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Subtotal</p>
              <p className="mt-1 font-bold">{formatCurrency(bill.subtotal)}</p>
            </div>
            {bill.discountAmount > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Discount</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-bold text-gold-400">−{formatCurrency(bill.discountAmount)}</span>
                  {bill.couponCode && (
                    <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                      {bill.couponCode}
                    </span>
                  )}
                </div>
              </div>
            )}
            {Number(bill.voucherDiscountAmount || 0) > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Voucher Redeemed</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-bold text-gold-400">−{formatCurrency(bill.voucherDiscountAmount)}</span>
                  {bill.voucherCode && (
                    <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                      {bill.voucherCode}
                    </span>
                  )}
                </div>
              </div>
            )}
            {(() => {
              const av = bill.awardedVoucher || (bill.awardedVoucherCode ? {
                code: bill.awardedVoucherCode,
                amount: bill.awardedVoucherAmount,
                initialValue: bill.awardedVoucherAmount,
              } : null);
              if (!av || (!av.code && !av.amount)) return null;
              return (
                <div className="border-l border-navy-700/80 pl-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <Gift size={11} /> Next-Visit Reward
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-bold text-emerald-300">
                      {formatCurrency(av.initialValue || av.amount || 0)} OFF
                    </span>
                    <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                      {av.code}
                    </span>
                  </div>
                </div>
              );
            })()}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Tax (8%)</p>
              <p className="mt-1 font-bold">{formatCurrency(bill.tax)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gold-400">Total Charged</p>
            <p className="mt-1 text-4xl font-black text-white">{formatCurrency(bill.total)}</p>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      {bill.payments && bill.payments.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-4 flex items-center gap-2">
            <CreditCard size={13} /> Payment Details
          </p>
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-navy-50/50 border-b border-navy-100">
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Date</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Mode</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-right">Amount</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {bill.payments.map((payment) =>
                  (payment.details || []).map((detail, dIdx) => (
                    <tr key={`${payment.id}-${dIdx}`} className="bg-white">
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-semibold text-navy-900 capitalize">
                          {detail.paymentMode?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-black text-navy-900">{formatCurrency(detail.amount)}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          payment.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                          payment.status === "pending" ? "bg-amber-50 text-amber-700" :
                          "bg-rose-50 text-rose-700"
                        }`}>
                          {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-navy-50/50 font-semibold">
                  <td colSpan={2} className="px-5 py-3 text-right text-sm font-bold text-navy-900">Total Paid</td>
                  <td className="px-5 py-3 text-right text-sm font-black text-emerald-600">
                    {formatCurrency(bill.payments.reduce((s, p) => s + (p.totalAmount || 0), 0))}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
            {bill.payments[0]?.transactionReference && (
              <p className="px-5 py-2 text-xs text-slate-500 border-t border-navy-50">
                Transaction Ref: <span className="font-semibold">{bill.payments[0].transactionReference}</span>
              </p>
            )}
            {bill.payments[0]?.notes && (
              <p className="px-5 py-2 text-xs text-slate-500 border-t border-navy-50">
                Notes: <span className="font-semibold">{bill.payments[0].notes}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {showReceiptModal && (
        <ThermalReceiptModal
          bill={bill}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {showAddPayment && (
        <AddPaymentModal
          bill={bill}
          onClose={() => setShowAddPayment(false)}
          onSuccess={(updated) => setBill(updated)}
        />
      )}
    </div>
  );
}
