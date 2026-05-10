import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Package,
  Receipt,
  Search,
  ChevronDown,
  Minus,
  FileText,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import {
  fetchProductMasters,
  createMultiProductPurchaseOrder,
} from "../../services/mockApi";

const TAX_PRESETS = [
  { label: "No Tax", value: 0 },
  { label: "SST 6%", value: 6 },
  { label: "SST 10%", value: 10 },
  { label: "Custom", value: -1 },
];

export default function PurchaseOrderPage() {
  const toast = useToastStore();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Order form state
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [taxPreset, setTaxPreset] = useState(0);
  const [customTaxRate, setCustomTaxRate] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProductMasters();
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // Derived values
  const effectiveTaxRate = taxPreset === -1 ? Number(customTaxRate) || 0 : taxPreset;

  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [orderItems],
  );

  const taxAmount = useMemo(
    () => Math.round(subtotal * (effectiveTaxRate / 100) * 100) / 100,
    [subtotal, effectiveTaxRate],
  );

  const grandTotal = subtotal + taxAmount;

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

    setSubmitting(true);
    try {
      await createMultiProductPurchaseOrder({
        supplierName: supplierName.trim(),
        items: orderItems,
        taxRate: effectiveTaxRate,
        notes: notes.trim(),
      });
      toast.success("Purchase order created successfully!");
      navigate("/inventory/po-history");
    } catch (err) {
      toast.error(err.message || "Failed to create purchase order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="New Purchase Order" />
        <LoadingState message="Loading products..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/inventory"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy-900">
              New Purchase Order
            </h1>
            <p className="text-sm text-slate-500">
              Select products, set quantities, and review tax before placing the
              order
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Left: Product Selection & Items ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier */}
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
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  className="premium-input w-full"
                />
              </div>
            </div>
          </div>

          {/* Product picker */}
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
                    <p className="p-4 text-center text-sm text-slate-400">
                      No products available
                    </p>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addProduct(product)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-navy-900">
                            {product.itemName}
                          </p>
                          <p className="text-xs text-slate-400">
                            Stock: {product.centralStock} &middot; Network:{" "}
                            {product.totalNetworkStock}
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
                <p className="text-sm font-semibold text-slate-500">
                  No products added yet
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Add Product" to start building your order
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {/* Desktop table */}
                <table className="hidden sm:table w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Product
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orderItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-navy-900">
                            {item.productName}
                          </p>
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
                              onChange={(e) =>
                                setQty(item.productId, e.target.value)
                              }
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
                            onChange={(e) =>
                              setUnitPrice(item.productId, e.target.value)
                            }
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
                        <p className="text-sm font-semibold text-navy-900">
                          {item.productName}
                        </p>
                        <button
                          onClick={() => removeProduct(item.productId)}
                          className="text-rose-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQty(item.productId, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              setQty(item.productId, e.target.value)
                            }
                            className="w-12 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-semibold"
                          />
                          <button
                            onClick={() => updateQty(item.productId, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-slate-400">×</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            setUnitPrice(item.productId, e.target.value)
                          }
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm font-medium"
                        />
                      </div>
                      <p className="text-right text-sm font-bold text-navy-900">
                        {formatCurrency(item.qty * item.unitPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Tax & Summary ─── */}
        <div className="space-y-6">
          {/* Tax selector */}
          <div className="glass-card">
            <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gold-500" />
              Tax
            </h2>
            <div className="space-y-3">
              {TAX_PRESETS.map((preset) => (
                <label
                  key={preset.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    taxPreset === preset.value
                      ? "border-gold-400 bg-gold-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="tax"
                    checked={taxPreset === preset.value}
                    onChange={() => setTaxPreset(preset.value)}
                    className="h-4 w-4 accent-gold-500"
                  />
                  <span className="text-sm font-medium text-navy-900">
                    {preset.label}
                  </span>
                </label>
              ))}

              {taxPreset === -1 && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Custom Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={customTaxRate}
                    onChange={(e) => setCustomTaxRate(e.target.value)}
                    placeholder="e.g. 7.5"
                    className="premium-input w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Order summary */}
          <div className="glass-card">
            <h2 className="text-lg font-bold text-navy-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Items</span>
                <span className="font-semibold text-navy-900">
                  {orderItems.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Qty</span>
                <span className="font-semibold text-navy-900">
                  {orderItems.reduce((s, i) => s + i.qty, 0)}
                </span>
              </div>

              <hr className="border-slate-200" />

              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-navy-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Tax ({effectiveTaxRate}%)
                </span>
                <span className="font-semibold text-navy-900">
                  {formatCurrency(taxAmount)}
                </span>
              </div>

              <hr className="border-slate-200" />

              <div className="flex justify-between text-base">
                <span className="font-bold text-navy-900">Grand Total</span>
                <span className="font-black text-navy-900">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || orderItems.length === 0}
              className="btn-premium-primary mt-6 w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              {submitting ? "Placing Order..." : "Place Purchase Order"}
            </button>

            <Link
              to="/inventory"
              className="btn-premium-outline mt-3 w-full flex items-center justify-center gap-2 text-sm"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
