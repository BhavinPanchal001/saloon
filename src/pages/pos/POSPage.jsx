import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { checkoutBill, fetchCatalog, fetchStaff } from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import { InvoiceModal } from "./InvoiceModal";
import { Search, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

const paymentMethods = ["Cash", "Card", "UPI"];

const createLineId = () => `line_${Math.random().toString(36).slice(2, 9)}`;

export function POSPage() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore();
  const [catalog, setCatalog] = useState([]);
  const [filteredCatalog, setFilteredCatalog] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payloadPreview, setPayloadPreview] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const loadPos = async () => {
      const [catalogItems, staffList] = await Promise.all([
        fetchCatalog({ outletId: user?.role === "admin" ? undefined : user?.outlet_id }),
        fetchStaff({ outletId: user?.role === "admin" ? undefined : user?.outlet_id }),
      ]);

      setCatalog(catalogItems);
      setFilteredCatalog(catalogItems);
      setStaffMembers(staffList);
    };

    if (user) {
      loadPos();
    }
  }, [user]);

  const addToCart = (item) => {
    setCart((current) => {
      if (item.type === "product") {
        const existing = current.find((line) => line.id === item.id && line.type === "product");
        if (existing) {
          return current.map((line) =>
            line.lineId === existing.lineId ? { ...line, quantity: line.quantity + 1 } : line,
          );
        }
      }

      return [
        ...current,
        {
          lineId: createLineId(),
          id: item.id,
          name: item.name,
          price: item.price,
          type: item.type,
          duration: item.duration,
          offerLabel: item.offerLabel,
          serviceCount: item.serviceCount,
          serviceItems: item.serviceItems || [],
          quantity: 1,
          staffId: "",
        },
      ];
    });
  };

  const updateLine = (lineId, key, value) => {
    setCart((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, [key]: value } : line)),
    );
  };

  const removeLine = (lineId) => {
    setCart((current) => current.filter((line) => line.lineId !== lineId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setPaymentMethod("");
    toast.success("Cart cleared");
  };

  const adjustQuantity = (lineId, delta) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId === lineId) {
          const newQuantity = Math.max(1, line.quantity + delta);
          return { ...line, quantity: newQuantity };
        }
        return line;
      }),
    );
  };

  const unassignStaff = (lineId) => {
    updateLine(lineId, "staffId", "");
    toast.info("Staff unassigned");
  };

  // Filter catalog based on search and category
  useEffect(() => {
    let filtered = catalog;

    if (activeCategory !== "All") {
      filtered = filtered.filter((item) => item.type === activeCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.category && item.category.toLowerCase().includes(query)),
      );
    }

    setFilteredCatalog(filtered);
  }, [searchQuery, activeCategory, catalog]);

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const hasUnassignedService = cart.some(
    (line) => line.type === "service" && !line.staffId,
  );
  const canCheckout = cart.length > 0 && paymentMethod && !hasUnassignedService;

  const handleCheckout = async () => {
    const payload = {
      customer,
      paymentMethod,
      outletId: user?.outlet_id || "all_outlets",
      subtotal,
      tax,
      total,
      lineItems: cart.map((line) => ({
        itemId: line.id,
        itemType: line.type,
        itemName: line.name,
        qty: line.quantity,
        price: line.price,
        staffAssigned: line.type === "service" ? line.staffId : null,
        includedServices:
          line.type === "package"
            ? line.serviceItems.map((service) => ({
                serviceId: service.serviceId,
                serviceName: service.serviceName,
                sessions: service.sessions,
              }))
            : undefined,
      })),
    };

    const result = await checkoutBill(payload);
    setCurrentBill(result);
    setShowInvoice(true);
    setPayloadPreview({
      billNumber: result.billNumber,
      payload,
    });
    setCart([]);
    setPaymentMethod("");
    setCustomer({ name: "", phone: "" });
    toast.success(`Bill ${result.billNumber} created successfully!`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="POS"
        title="Point of Sale"
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* ── Catalog Panel ── */}
        <div className="glass-card !p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="premium-label !mb-0">Catalog Menu</p>
            <span className="text-xs font-semibold text-slate-400">{filteredCatalog.length} items</span>
          </div>

          {/* Search + filter row */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search services, packages, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="premium-input !py-2.5 !pl-9 !text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {["All", "Service", "Package", "Product"].map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeCategory === category
                      ? "bg-navy-900 text-white"
                      : "bg-white/60 text-slate-600 hover:bg-white border border-navy-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {filteredCatalog.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-navy-50 bg-white/40 py-10 text-center">
              <ShoppingCart className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-500">
                {searchQuery ? `No results for "${searchQuery}"` : "No items in this category"}
              </p>
            </div>
          )}

          {/* Catalog grid — compact cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCatalog.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => addToCart(item)}
                className="group relative flex flex-col rounded-2xl border border-navy-50 bg-white/60 p-4 text-left transition-all hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-navy-950/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                      item.type === "service"
                        ? "bg-navy-50 text-navy-600"
                        : item.type === "package"
                          ? "bg-gold-50 text-gold-700"
                          : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {item.type}
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-all">
                    +
                  </div>
                </div>

                <p className="text-sm font-bold text-navy-900 leading-snug">{item.name}</p>

                <p className="mt-1 text-[11px] text-slate-400 font-medium">
                  {item.type === "service"
                    ? `${item.duration} min`
                    : item.type === "package"
                      ? `${item.serviceCount} items · ${item.duration} min`
                      : `${item.stock} in stock`}
                </p>

                {item.type === "package" && item.offerLabel && (
                  <span className="mt-1.5 inline-block rounded bg-gold-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-gold-700">
                    {item.offerLabel}
                  </span>
                )}

                <p className="mt-2 text-sm font-black text-navy-800">
                  {formatCurrency(item.price)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Cart Panel ── */}
        <div className="glass-card !p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="premium-label !mb-0">Checkout Desk</p>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Customer fields */}
          <div className="grid grid-cols-2 gap-2">
            <input
              className="premium-input !py-2.5 !text-sm"
              placeholder="Guest Name"
              value={customer.name}
              onChange={(event) =>
                setCustomer((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="premium-input !py-2.5 !text-sm"
              placeholder="Contact Number"
              value={customer.phone}
              onChange={(event) =>
                setCustomer((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>

          {/* Cart items */}
          <div>
            <p className="premium-label !mb-2">Cart Items ({cart.length})</p>
            {cart.length ? (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {cart.map((line) => (
                  <div key={line.lineId} className="rounded-xl border border-navy-50/50 bg-white/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-navy-900 truncate">{line.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {line.type} · qty {line.quantity}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-slate-300 hover:text-rose-500 transition-colors"
                        onClick={() => removeLine(line.lineId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {line.type === "service" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          className="premium-input !py-2 !px-3 !text-xs appearance-none flex-1"
                          value={line.staffId}
                          onChange={(event) => updateLine(line.lineId, "staffId", event.target.value)}
                        >
                          <option value="">Assign Talent</option>
                          {staffMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                        {line.staffId && (
                          <button
                            type="button"
                            onClick={() => unassignStaff(line.lineId)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Unassign
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-navy-300">Qty</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(line.lineId, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
                            disabled={line.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-navy-900">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustQuantity(line.lineId, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="mt-1.5 text-xs font-black text-navy-600">
                      {formatCurrency(line.price * line.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy-100 bg-white/20 py-8 text-center">
                <ShoppingCart className="h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Cart is empty. Add items from the catalog to begin.
                </p>
              </div>
            )}
          </div>

          {/* Totals + payment */}
          <div className="rounded-2xl border border-navy-100 bg-navy-950/5 p-4">
            <div className="space-y-2 text-sm font-medium text-navy-800">
              <div className="flex items-center justify-between opacity-60">
                <span>Subtotal</span>
                <span className="font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between opacity-60">
                <span>Tax (8%)</span>
                <span className="font-bold">{formatCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 pt-3 text-lg font-black text-navy-900">
                <span>Total Due</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={
                    paymentMethod === method
                      ? "rounded-xl bg-navy-900 py-3 text-[10px] font-black uppercase tracking-widest text-white ring-2 ring-navy-300"
                      : "rounded-xl border border-navy-100 bg-white py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 transition hover:bg-navy-50"
                  }
                  onClick={() => setPaymentMethod(method)}
                >
                  {method}
                </button>
              ))}
            </div>

            {cart.length === 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Add items to cart to continue checkout</span>
              </div>
            )}

            {cart.length > 0 && !paymentMethod && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Select a payment method to continue</span>
              </div>
            )}

            {hasUnassignedService && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Assign talent to all services to continue</span>
              </div>
            )}

            <button
              type="button"
              className="btn-premium-primary mt-3 w-full disabled:opacity-50 disabled:grayscale"
              onClick={handleCheckout}
              disabled={!canCheckout}
            >
              Complete Billing
            </button>
          </div>

          {payloadPreview ? (
            <div className="rounded-2xl border border-navy-800 bg-navy-950 p-4 text-navy-100">
              <p className="text-xs font-black uppercase tracking-widest text-navy-400">Mocked JSON · {payloadPreview.billNumber}</p>
              <pre className="mt-3 overflow-x-auto text-xs leading-5 text-navy-300 font-mono max-h-48 custom-scrollbar">
                {JSON.stringify(payloadPreview.payload, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>

      {showInvoice && (
        <InvoiceModal
          bill={currentBill}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
}
