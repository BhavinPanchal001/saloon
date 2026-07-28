import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Save, User, Scissors, Package as PackageIcon, ShoppingBag, Percent, DollarSign, Loader2 } from "lucide-react";
import { fetchPOSCatalogFromAPI, fetchStaff, updateBillAPI } from "../../services/api";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";

export function EditInvoiceModal({ bill, onClose, onSuccess }) {
  const toast = useToastStore();
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Form states
  const [customer, setCustomer] = useState({
    name: bill?.customer?.name || "",
    phone: bill?.customer?.phone || "",
  });

  const [lineItems, setLineItems] = useState(
    (bill?.lineItems || []).map((item) => ({
      ...item,
      qty: Number(item.qty) || 1,
      price: Number(item.price) || 0,
      staffAssigned: item.staffAssigned || "",
    }))
  );

  const [discountType, setDiscountType] = useState(bill?.discountType || "percent");
  const [discountValue, setDiscountValue] = useState(bill?.discountValue !== undefined ? String(bill.discountValue) : "0");
  const [tax, setTax] = useState(bill?.tax !== undefined ? String(bill.tax) : "0");

  // Catalog & Staff
  const [catalog, setCatalog] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setCatalogLoading(true);
      try {
        const [catData, staffData] = await Promise.all([
          fetchPOSCatalogFromAPI({ outletId: bill?.outletId }),
          fetchStaff({ outletId: bill?.outletId }),
        ]);
        setCatalog(catData || []);
        setStaffList(staffData || []);
      } catch (err) {
        console.error("Failed to load catalog or staff for edit modal:", err);
      } finally {
        setCatalogLoading(false);
      }
    };
    if (bill) loadData();
  }, [bill]);

  // Calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
  }, [lineItems]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (discountType === "fixed") {
      return Math.min(subtotal, val);
    }
    return (subtotal * val) / 100;
  }, [subtotal, discountType, discountValue]);

  const calculatedTax = useMemo(() => {
    // If tax was untouched or calculated as 8%
    const numTax = Number(tax);
    if (!isNaN(numTax) && numTax > 0) return numTax;
    const taxable = Math.max(0, subtotal - discountAmount);
    return taxable * 0.08;
  }, [subtotal, discountAmount, tax]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + calculatedTax);
  }, [subtotal, discountAmount, calculatedTax]);

  const totalPaid = useMemo(() => {
    return (bill?.payments || []).reduce((acc, p) => {
      return acc + (p.details || []).reduce((sum, d) => sum + Number(d.amount || 0), 0);
    }, 0);
  }, [bill]);

  const handleAddItem = (catalogItemId) => {
    if (!catalogItemId) return;
    const item = catalog.find((c) => String(c.id) === String(catalogItemId));
    if (!item) return;

    setLineItems((prev) => [
      ...prev,
      {
        id: item.id,
        itemId: item.id,
        itemType: item.itemType || item.type || "service",
        itemName: item.name || item.itemName,
        qty: 1,
        price: Number(item.price) || 0,
        staffAssigned: "",
        productConsumption: item.productConsumption || null,
        includedServices: item.includedServices || null,
      },
    ]);
    setSelectedCatalogId("");
  };

  const handleRemoveItem = (index) => {
    if (lineItems.length <= 1) {
      toast.error("An invoice must have at least one line item.");
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer,
        lineItems: lineItems.map((item) => ({
          itemId: item.itemId || item.id,
          itemType: item.itemType,
          itemName: item.itemName,
          qty: Number(item.qty) || 1,
          price: Number(item.price) || 0,
          staffAssigned: item.staffAssigned || null,
          productConsumption: item.productConsumption || null,
          includedServices: item.includedServices || null,
        })),
        discountType,
        discountValue: Number(discountValue) || 0,
        discountAmount,
        tax: calculatedTax,
        subtotal,
        total,
      };

      const result = await updateBillAPI(bill.id, payload);
      toast.success("Invoice updated successfully!");
      if (onSuccess) onSuccess(result.bill);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  if (!bill) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-100 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-navy-900">Edit Invoice #{bill.billNumber}</h2>
              <span className={`status-badge text-xs px-3 py-1 ${
                bill.status === "paid" ? "status-active" : bill.status === "partially_paid" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
              }`}>
                {bill.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Modify customer info, items, pricing, or discounts for this invoice.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <div className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3 flex items-center gap-1.5">
              <User size={13} /> Customer Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Walk-in Guest"
                  className="premium-input !py-2 !text-xs w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="premium-input !py-2 !text-xs w-full"
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 flex items-center gap-1.5">
                <ShoppingBag size={13} /> Invoice Items
              </p>
              
              {/* Add Item Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCatalogId}
                  onChange={(e) => handleAddItem(e.target.value)}
                  disabled={catalogLoading}
                  className="premium-input !py-1.5 !px-3 !text-xs max-w-xs"
                >
                  <option value="">+ Add Item from Catalog...</option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.itemType?.toUpperCase() || "ITEM"}] {item.name || item.itemName} ({formatCurrency(item.price)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-navy-50/60 border-b border-navy-100 text-navy-700">
                    <th className="px-4 py-3 font-bold">Item Description</th>
                    <th className="px-4 py-3 font-bold w-40">Staff Assigned</th>
                    <th className="px-4 py-3 font-bold text-center w-24">Qty</th>
                    <th className="px-4 py-3 font-bold text-right w-32">Price (RM)</th>
                    <th className="px-4 py-3 font-bold text-right w-32">Amount</th>
                    <th className="px-3 py-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-navy-50/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${
                            item.itemType === "service" ? "bg-purple-50 text-purple-600" :
                            item.itemType === "package" ? "bg-gold-50 text-gold-600" : "bg-blue-50 text-blue-600"
                          }`}>
                            {item.itemType === "service" ? <Scissors size={13} /> : <PackageIcon size={13} />}
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                              className="font-bold text-navy-900 border-b border-transparent hover:border-navy-200 focus:border-navy-500 focus:outline-none bg-transparent px-1 py-0.5 w-full"
                            />
                            <p className="text-[10px] text-slate-400 capitalize pl-1">{item.itemType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.staffAssigned || ""}
                          onChange={(e) => handleItemChange(idx, "staffAssigned", e.target.value)}
                          className="premium-input !py-1 !px-2 !text-xs w-full"
                        >
                          <option value="">None / Unassigned</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.fullName || s.name || s.id}>
                              {s.fullName || s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                          className="premium-input !py-1 !px-2 !text-xs text-center w-16"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, "price", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="premium-input !py-1 !px-2 !text-xs text-right w-24"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-navy-900">
                        {formatCurrency(Number(item.qty) * Number(item.price))}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="Remove Item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount & Tax Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-navy-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3 flex items-center gap-1.5">
                <TagIcon size={13} /> Discount
              </p>
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl bg-navy-50 p-1 border border-navy-100">
                  <button
                    type="button"
                    onClick={() => setDiscountType("percent")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      discountType === "percent" ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800"
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      discountType === "fixed" ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800"
                    }`}
                  >
                    RM
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  className="premium-input !py-2 !text-xs flex-1"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-3">
                Tax Amount (RM)
              </p>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
                className="premium-input !py-2 !text-xs w-full"
              />
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="rounded-2xl bg-navy-900 p-5 text-white shadow-lg space-y-2">
            <div className="flex justify-between text-xs text-navy-300">
              <span>Subtotal:</span>
              <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-gold-400">
                <span>Discount ({discountType === "percent" ? `${discountValue}%` : "Fixed"}):</span>
                <span className="font-semibold">−{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-navy-300">
              <span>Tax:</span>
              <span className="font-semibold text-white">{formatCurrency(calculatedTax)}</span>
            </div>
            <div className="border-t border-navy-800 pt-3 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gold-400">Updated Total</p>
                <p className="text-2xl font-black">{formatCurrency(total)}</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-navy-300">Paid to date: <span className="font-bold text-emerald-400">{formatCurrency(totalPaid)}</span></p>
                <p className="text-navy-300 mt-0.5">
                  {totalPaid >= total ? (
                    <span className="text-emerald-400 font-bold">✓ Fully Paid</span>
                  ) : (
                    <span className="text-amber-400 font-bold">Due: {formatCurrency(total - totalPaid)}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-premium-outline !py-2.5 !px-5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-premium-primary !py-2.5 !px-6 text-xs flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={15} /> Save Invoice Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function TagIcon({ size }) {
  return <Percent size={size} />;
}
