import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { checkoutBill, fetchCatalog, fetchStaff } from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";
import { InvoiceModal } from "./InvoiceModal";

const paymentMethods = ["Cash", "Card", "UPI"];

const createLineId = () => `line_${Math.random().toString(36).slice(2, 9)}`;

export function POSPage() {
  const user = useAuthStore((state) => state.user);
  const [catalog, setCatalog] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payloadPreview, setPayloadPreview] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);

  useEffect(() => {
    const loadPos = async () => {
      const [catalogItems, staffList] = await Promise.all([
        fetchCatalog({ outletId: user?.role === "admin" ? undefined : user?.outlet_id }),
        fetchStaff({ outletId: user?.role === "admin" ? undefined : user?.outlet_id }),
      ]);

      setCatalog(catalogItems);
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
  };

  return (
    <div>
      <PageHeader
        eyebrow="POS"
        title="Billing Screen"
        description="Add services, packages, and retail items into the cart, assign staff to every live service line, and compile a checkout payload ready for backend posting."
      />

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-card !p-8">
          <div className="flex items-center justify-between border-b border-navy-50/50 pb-6">
            <div>
              <p className="premium-label">Catalog Menu</p>
              <h2 className="mt-2 text-3xl text-navy-900">Services & Retail</h2>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => addToCart(item)}
                className="group relative flex flex-col rounded-[2rem] border border-navy-50 bg-white/60 p-6 text-left transition-all hover:-translate-y-2 hover:bg-white hover:shadow-2xl hover:shadow-navy-950/5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`status-badge ${
                      item.type === "service"
                        ? "bg-navy-50 text-navy-600"
                        : item.type === "package"
                          ? "bg-gold-50 text-gold-700"
                          : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {item.type}
                  </span>
                  <div className="h-2 w-2 rounded-full bg-navy-100 group-hover:bg-gold-400 group-hover:scale-150 transition-all"></div>
                </div>
                
                <h3 className="mt-6 text-2xl font-bold text-navy-900 leading-tight">{item.name}</h3>
                
                <p className="mt-2 text-xs text-slate-500 font-medium tracking-wide">
                  {item.type === "service"
                    ? `${item.duration} min`
                    : item.type === "package"
                      ? `${item.serviceCount} items • ${item.duration} min`
                      : `${item.stock} in stock`}
                </p>

                {item.type === "package" && item.offerLabel && (
                  <div className="mt-3 inline-block rounded-lg bg-gold-400/10 px-3 py-1 text-[10px] font-black uppercase text-gold-700">
                    {item.offerLabel}
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <p className="text-xl font-black text-navy-800">
                    {formatCurrency(item.price)}
                  </p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-900 text-white opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
                    +
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card !p-8">
          <p className="premium-label">Checkout Desk</p>
          <h2 className="mt-2 text-3xl text-navy-900">Client details</h2>

          <div className="mt-8 space-y-4">
            <input
              className="premium-input"
              placeholder="Guest Name"
              value={customer.name}
              onChange={(event) =>
                setCustomer((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="premium-input"
              placeholder="Contact Number"
              value={customer.phone}
              onChange={(event) =>
                setCustomer((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>

          <div className="mt-8 space-y-5">
            <p className="premium-label">Selected Items ({cart.length})</p>
            {cart.length ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((line) => (
                  <div key={line.lineId} className="rounded-3xl border border-navy-50/50 bg-white/60 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-navy-900">{line.name}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {line.type} • Qty {line.quantity}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                        onClick={() => removeLine(line.lineId)}
                      >
                        Remove
                      </button>
                    </div>

                    {line.type === "service" ? (
                      <div className="mt-4">
                        <select
                          className="premium-input !py-3 !px-4 text-xs appearance-none"
                          value={line.staffId}
                          onChange={(event) => updateLine(line.lineId, "staffId", event.target.value)}
                        >
                          <option value="">Assign Service Talent</option>
                          {staffMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-navy-300">Adjust Qty</label>
                        <input
                          type="number"
                          min="1"
                          className="premium-input !py-2 !px-4 !w-24 text-center"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(
                              line.lineId,
                              "quantity",
                              Math.max(1, Number(event.target.value) || 1),
                            )
                          }
                        />
                      </div>
                    )}

                    <p className="mt-4 text-sm font-black text-navy-600">
                      {formatCurrency(line.price * line.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-navy-100 bg-white/20 p-10 text-center">
                <div className="h-12 w-12 rounded-full bg-navy-50 mb-4 flex items-center justify-center text-navy-300 text-2xl">🛒</div>
                <p className="text-sm font-medium text-slate-500">Cart is empty.<br/>Add items to begin bill.</p>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-[2rem] border border-navy-100 bg-navy-950/5 p-8">
            <div className="space-y-4 text-sm font-medium text-navy-800">
              <div className="flex items-center justify-between opacity-60 font-bold">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between opacity-60 font-bold">
                <span>Tax (8%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 pt-6 text-2xl font-black text-navy-900">
                <span>Total Due</span>
                <span className="text-navy-900">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={
                    paymentMethod === method
                      ? "rounded-2xl bg-navy-900 py-4 text-[10px] font-black uppercase tracking-widest text-white ring-4 ring-navy-100"
                      : "rounded-2xl border border-navy-100 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-navy-600 transition hover:bg-navy-50"
                  }
                  onClick={() => setPaymentMethod(method)}
                >
                  {method}
                </button>
              ))}
            </div>

            {hasUnassignedService && (
              <div className="mt-6 flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-[10px] font-black uppercase tracking-widest text-rose-600">
                <span>⚠️</span>
                <span>Assign talent to all services to continue</span>
              </div>
            )}

            <button
              type="button"
              className="btn-premium-primary mt-8 w-full shadow-2xl transition-all disabled:opacity-50 disabled:grayscale"
              onClick={handleCheckout}
              disabled={!canCheckout}
            >
              Complete Billing
            </button>
          </div>

          {payloadPreview ? (
            <div className="mt-8 rounded-[2rem] border border-navy-800 bg-navy-950 p-8 text-navy-100">
              <p className="text-xs font-black uppercase tracking-widest text-navy-400">Mocked JSON payload • {payloadPreview.billNumber}</p>
              <pre className="mt-6 overflow-x-auto text-xs leading-6 text-navy-300 font-mono">
                {JSON.stringify(payloadPreview.payload, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      {showInvoice && (
        <InvoiceModal
          bill={currentBill}
          onClose={() => setShowInvoice(false)}
        />
      )}
      </div>
    </div>
  );
}
