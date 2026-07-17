import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, MapPin, Package, Scissors, CreditCard, Info, FlaskConical, Banknote } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { formatCurrency } from "../../utils/format";
import { getUnitAbbr } from "../../utils/unitConversion";
import { fetchBillByIdFromAPI, fetchProductsFromAPI } from "../../services/api";

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
  const [bill, setBill] = useState(null);
  const [productMasters, setProductMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <span className={`status-badge text-sm px-4 py-1.5 ${bill.status === "paid" ? "status-active" : "status-danger"}`}>
          {bill.status}
        </span>
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
            <div className="flex items-center gap-3 text-sm">
              <CreditCard size={15} className="text-navy-400 flex-shrink-0" />
              <span className="text-navy-700">Paid via {bill.paymentMethod}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items — with inline product consumption */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-4">Items & Services</p>
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 border-b border-navy-100">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Item</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600">Staff</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-center">Qty</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {bill.lineItems.map((item, idx) => {
                const serviceConsumptions = item.itemType === "service" ? (item.productConsumption || []) : [];
                const packageServiceConsumptions = item.itemType === "package"
                  ? (item.includedServices || []).filter(s => s.productConsumption?.length > 0)
                  : [];

                return (
                  <React.Fragment key={`group-${idx}`}>
                    {/* Main item row */}
                    <tr className="bg-white">
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
                        <span className="text-xs font-semibold text-navy-600">{item.staffAssigned || "—"}</span>
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

                    {/* Service product consumption sub-rows */}
                    {serviceConsumptions.map((c, cIdx) => {
                      const product = productMasters.find((p) => String(p.id) === String(c.productId));
                      const um = product?.unitMaster;
                      const unitAbbr = um ? getUnitAbbr(um, c.unit || "primary") : "";
                      return (
                        <tr key={`svc-c-${idx}-${cIdx}`} className="bg-purple-50/30">
                          <td className="px-5 py-2.5 pl-16" colSpan={2}>
                            <div className="flex items-center gap-2">
                              <FlaskConical size={12} className="text-purple-400 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-purple-900">{product?.itemName || `Product #${c.productId}`}</p>
                                {product?.productMeasureLabel && (
                                  <p className="text-[10px] text-slate-400">Pack: {product.productMeasureLabel}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-center">
                            <span className="text-xs font-bold text-purple-700">{c.qty} {unitAbbr}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">consumed</span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Package → service product consumption sub-rows */}
                    {packageServiceConsumptions.map((svc, sIdx) =>
                      svc.productConsumption.map((c, cIdx) => {
                        const product = productMasters.find((p) => String(p.id) === String(c.productId));
                        const um = product?.unitMaster;
                        const unitAbbr = um ? getUnitAbbr(um, c.unit || "primary") : "";
                        return (
                          <tr key={`pkg-c-${idx}-${sIdx}-${cIdx}`} className="bg-gold-50/30">
                            <td className="px-5 py-2.5 pl-16" colSpan={2}>
                              <div className="flex items-center gap-2">
                                <FlaskConical size={12} className="text-gold-500 flex-shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gold-600 font-semibold uppercase tracking-wide">{svc.serviceName}</p>
                                  <p className="text-xs font-semibold text-navy-900">{product?.itemName || `Product #${c.productId}`}</p>
                                  {product?.productMeasureLabel && (
                                    <p className="text-[10px] text-slate-400">Pack: {product.productMeasureLabel}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-center">
                              <span className="text-xs font-bold text-gold-700">{c.qty} {unitAbbr}</span>
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <span className="text-[10px] font-semibold text-gold-400 uppercase tracking-wide">consumed</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
                );
              })}
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
                <p className="mt-1 font-bold text-gold-400">−{formatCurrency(bill.discountAmount)}</p>
              </div>
            )}
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
    </div>
  );
}
