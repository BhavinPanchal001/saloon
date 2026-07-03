import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Package,
  Search,
  Minus,
  FileText,
  CreditCard,
  Receipt,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import BankSelector from "../../modules/bank/components/BankSelector";
import {
  fetchProductsFromAPI,
  createPurchaseOrderAPI,
  fetchPurchaseOrderByIdFromAPI,
  updatePurchaseOrderAPI,
  deleteAttachmentAPI,
} from "../../services/api";


export default function PurchaseOrderPage() {
  const toast = useToastStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalOrder, setOriginalOrder] = useState(null);

  // Order form state
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Payment state
  const [enablePayment, setEnablePayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState([
    { paymentMode: "cash", amount: 0 },
  ]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  useEffect(() => {
    loadProducts();
    if (isEditMode) {
      loadOrder();
    }
  }, [id]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProductsFromAPI();
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadOrder = async () => {
    try {
      setLoading(true);
      const order = await fetchPurchaseOrderByIdFromAPI(id);
      setOriginalOrder(order);
      // Populate form
      setSupplierName(order.supplierName || "");
      setSupplierPhone(order.supplierPhone || "");
      setNotes(order.notes || "");
      setPurchaseDate(order.orderDate || new Date().toISOString().split("T")[0]);
      setExistingAttachment(order.attachmentPath || null);
      setOrderItems(order.items?.map(item => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })) || []);
      // Payment section - show if existing payments
      if (order.payments && order.payments.length > 0) {
        setEnablePayment(true);
        const payment = order.payments[0];
        setTransactionReference(payment.transactionReference || "");
        setPaymentNotes(payment.notes || "");
        setBankAccountId(payment.bankAccountId || "");
        setPaymentDetails(payment.details?.map(d => ({
          paymentMode: d.paymentMode,
          amount: d.amount,
        })) || [{ paymentMode: "cash", amount: 0 }]);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  };

  // Derived values
  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [orderItems],
  );

  const grandTotal = subtotal;

  // Filtered products for picker (exclude already added)
  const addedProductIds = new Set(orderItems.map((i) => i.productId));
  const filteredProducts = products.filter(
    (p) =>
      !addedProductIds.has(p.id) &&
      (!searchQuery ||
        p.itemName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Add a product to the order
  const addProduct = (product) => {
    setOrderItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.itemName,
        qty: 1,
        unitPrice: product.unitPrice,
      },
    ]);
    setSearchQuery("");
    setShowProductPicker(false);
  };

  // Update quantity
  const updateQty = (productId, delta) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item,
      ),
    );
  };

  const setQty = (productId, value) => {
    const qty = Math.max(1, Number(value) || 1);
    setOrderItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, qty } : item,
      ),
    );
  };

  // Update unit price override
  const setUnitPrice = (productId, value) => {
    const unitPrice = Math.max(0, Number(value) || 0);
    setOrderItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, unitPrice } : item,
      ),
    );
  };

  // Remove product from order
  const removeProduct = (productId) => {
    setOrderItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Payment handlers
  const addPaymentMethod = () => {
    setPaymentDetails((prev) => [...prev, { paymentMode: "cash", amount: 0 }]);
  };

  const removePaymentMethod = (index) => {
    setPaymentDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePaymentDetail = (index, field, value) => {
    setPaymentDetails((prev) =>
      prev.map((detail, i) => (i === index ? { ...detail, [field]: value } : detail))
    );
  };

  const totalPaymentAmount = paymentDetails.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const paymentBalance = grandTotal - totalPaymentAmount;

  // Submit order
  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      toast.warning("Please add at least one product to the order.");
      return;
    }
    if (!supplierName.trim()) {
      toast.warning("Please enter a supplier name.");
      return;
    }
    if (supplierPhone && (!/^\d+$/.test(supplierPhone) || supplierPhone.length > 15)) {
      toast.warning("Supplier phone must be numbers only, max 15 digits.");
      return;
    }

    if (enablePayment && totalPaymentAmount > grandTotal) {
      toast.warning(`Payment amount (${formatCurrency(totalPaymentAmount)}) cannot exceed the order total (${formatCurrency(grandTotal)}).`);
      return;
    }

    if (enablePayment) {
      const hasBankTransferOrCheque = paymentDetails.some(d =>
        (d.paymentMode === 'bank_transfer' || d.paymentMode === 'cheque') && Number(d.amount) > 0
      );
      if (hasBankTransferOrCheque && !bankAccountId.trim()) {
        toast.warning("Bank account selection is required for bank transfer and cheque payments.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim(),
        supplier_phone: supplierPhone.trim(),
        items: orderItems,
        taxRate: 0,
        notes: notes.trim(),
        orderDate: purchaseDate,
      };

      // Add payment if enabled
      const payment = enablePayment
        ? {
          status: "completed",
          transactionReference: transactionReference.trim(),
          notes: paymentNotes.trim(),
          paymentDate: new Date().toISOString().split("T")[0],
          bankAccountId: bankAccountId.trim() || null,
          details: paymentDetails
            .filter((d) => Number(d.amount) > 0)
            .map((d) => ({
              paymentMode: d.paymentMode,
              amount: Number(d.amount),
              bankAccountId: (d.paymentMode === 'bank_transfer' || d.paymentMode === 'cheque') ? bankAccountId.trim() || null : null,
            })),
        }
        : false; // false indicates payment should be deleted

      if (isEditMode) {
        payload.payment = payment;
        await updatePurchaseOrderAPI(id, payload, attachmentFile || null);
        toast.success("Purchase order updated successfully!");
      } else {
        await createPurchaseOrderAPI(payload, enablePayment ? payment : null, attachmentFile || null);
        toast.success("Purchase order created successfully!");
      }
      navigate("/inventory/purchase-orders");
    } catch (err) {
      toast.error(err.message || `Failed to ${isEditMode ? 'update' : 'create'} purchase order.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={isEditMode ? "Edit Purchase Order" : "New Purchase Order"} />
        <LoadingState message="Loading products..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/inventory/purchase-orders"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-navy-900">
            {isEditMode ? "Edit Purchase Order" : "New Purchase Order"}
          </h1>
          <p className="text-xs text-slate-500">
            {isEditMode
              ? "Modify order details, products, and payment information"
              : "Fill in the details below to place a new purchase order"}
          </p>
        </div>
      </div>

      {/* ─── Step 1: Order Details ─── */}
      <div className="glass-card">
        <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gold-500" />
          Order Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Supplier Name *
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Beauty Supplies Co."
              className="premium-input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Supplier Phone (optional)
            </label>
            <input
              type="tel"
              value={supplierPhone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                if (digits.length <= 15) setSupplierPhone(digits);
              }}
              placeholder="e.g. 60123456789"
              maxLength={15}
              className="premium-input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Purchase Date *
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="premium-input w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Description / Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or description..."
              className="premium-input w-full resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Attachment (optional)
            </label>
            {existingAttachment && !attachmentFile && (
              <div className="flex items-center gap-3 mb-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <a
                  href={`http://localhost:5001/uploads/${existingAttachment}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline flex-1 truncate"
                >
                  {existingAttachment.split('/').pop()}
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteAttachmentAPI(id);
                      setExistingAttachment(null);
                      toast.success("Attachment removed");
                    } catch {
                      toast.error("Failed to remove attachment");
                    }
                  }}
                  className="text-rose-400 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
              className="premium-input w-full text-sm"
            />
            {attachmentFile && (
              <p className="mt-1 text-xs text-slate-500">
                Selected: {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Step 2: Item Selection ─── */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-gold-500" />
            Products
          </h2>
          <button
            onClick={() => setShowProductPicker(!showProductPicker)}
            className="btn-premium-primary flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {/* Product search dropdown */}
        {showProductPicker && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="relative p-3 border-b border-slate-100">
              <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="premium-input w-full pl-10"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-400">No products available</p>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{product.itemName}</p>
                      <p className="text-xs text-slate-400">
                        Stock: {product.centralStock} &middot; Network: {product.totalNetworkStock}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-navy-900">
                      {formatCurrency(product.unitPrice)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Order items table */}
        {orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No products added yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add Product" to start building your order</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {/* Desktop table */}
            <table className="hidden sm:table w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orderItems.map((item) => (
                  <tr key={item.productId}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-navy-900">{item.productName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => setQty(item.productId, e.target.value)}
                          className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-semibold text-navy-900"
                        />
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => setUnitPrice(item.productId, e.target.value)}
                        className="w-24 ml-auto block rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm font-medium text-navy-900"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-navy-900">
                      {formatCurrency(item.qty * item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeProduct(item.productId)}
                        className="text-rose-400 hover:text-rose-600 transition"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {orderItems.map((item) => (
                <div key={item.productId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-navy-900">{item.productName}</p>
                    <button onClick={() => removeProduct(item.productId)} className="text-rose-400 hover:text-rose-600 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.productId, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input type="number" min="1" value={item.qty} onChange={(e) => setQty(item.productId, e.target.value)} className="w-12 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-semibold" />
                      <button onClick={() => updateQty(item.productId, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">×</span>
                    <input type="number" min="0" value={item.unitPrice} onChange={(e) => setUnitPrice(item.productId, e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm font-medium" />
                  </div>
                  <p className="text-right text-sm font-bold text-navy-900">{formatCurrency(item.qty * item.unitPrice)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Step 3: Payment ─── */}
      <div className="glass-card">
        <label className="flex cursor-pointer items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={enablePayment}
            onChange={(e) => {
              const checked = e.target.checked;
              setEnablePayment(checked);
              if (!checked) {
                setPaymentDetails([{ paymentMode: 'cash', amount: '' }]);
                setBankAccountId('');
              }
            }}
            className="h-4 w-4 accent-gold-500"
          />
          <span className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gold-500" />
            Add Payment Now
          </span>
        </label>

        {enablePayment && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentDetails.map((detail, index) => (
                <div key={index} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={detail.paymentMode}
                      onChange={(e) => updatePaymentDetail(index, "paymentMode", e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                    {paymentDetails.length > 1 && (
                      <button onClick={() => removePaymentMethod(index)} className="p-1.5 text-rose-400 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm font-medium">RM</span>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={detail.amount || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const otherTotal = paymentDetails.reduce((s, d, i) => i === index ? s : s + (Number(d.amount) || 0), 0);
                        const capped = Math.min(val, grandTotal - otherTotal);
                        updatePaymentDetail(index, "amount", capped >= 0 ? capped : 0);
                      }}
                      placeholder="Amount"
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addPaymentMethod}
              className="text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Another Payment Method
            </button>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Transaction Ref (optional)
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. TXN123456"
                  className="premium-input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Notes (optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any payment remarks..."
                  className="premium-input w-full text-sm"
                />
              </div>
            </div>

            <BankSelector
              value={bankAccountId}
              onChange={setBankAccountId}
              label="Bank Account (required for Bank Transfer & Cheque)"
              placeholder="Select bank account"
              className="mt-4"
              showDefaultIndicator={true}
            />
          </div>
        )}
      </div>

      {/* ─── Step 4: Summary & Submit ─── */}
      <div className="glass-card">
        <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-gold-500" />
          Order Summary
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Items</span>
            <span className="font-semibold text-navy-900">{orderItems.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Qty</span>
            <span className="font-semibold text-navy-900">{orderItems.reduce((s, i) => s + i.qty, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-navy-900">{formatCurrency(subtotal)}</span>
          </div>
        </div>
        <div className="flex justify-between text-base py-3 border-t border-slate-200 mb-2">
          <span className="font-bold text-navy-900">Grand Total</span>
          <span className="font-black text-xl text-navy-900">{formatCurrency(grandTotal)}</span>
        </div>
        {enablePayment && (
          <div className="flex justify-between text-sm py-2 border-t border-slate-200 mb-4">
            <span className="text-slate-500">Balance</span>
            <span className={`font-semibold ${paymentBalance === 0 ? "text-green-600" :
              paymentBalance > 0 ? "text-amber-500" : "text-rose-500"
              }`}>
              {paymentBalance === 0 ? "Fully Paid" :
                paymentBalance > 0 ? `Due: ${formatCurrency(paymentBalance)}` :
                  `Overpaid: ${formatCurrency(Math.abs(paymentBalance))}`}
            </span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || orderItems.length === 0}
          className="btn-premium-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="h-4 w-4" />
          {submitting
            ? (isEditMode ? "Updating..." : "Placing Order...")
            : (isEditMode ? "Update Purchase Order" : "Place Purchase Order")}
        </button>

        <Link
          to="/inventory/purchase-orders"
          className="btn-premium-outline mt-3 w-full flex items-center justify-center gap-2 text-sm"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
