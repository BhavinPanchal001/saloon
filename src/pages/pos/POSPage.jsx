import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchStaff } from "../../services/mockApi";
import { fetchPOSCatalogFromAPI, checkoutBillAPI, fetchOutletsFromAPI, fetchProductsFromAPI, fetchOutletInventoryFromAPI } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import { getAvailableUnits, getUnitAbbr, convertToBase } from "../../utils/unitConversion";
import { InvoiceModal } from "./InvoiceModal";
import { Search, Minus, Plus, Trash2, ShoppingCart, ArrowLeftRight, Tag, AlertCircle, CreditCard } from "lucide-react";
import BankSelector from "../../modules/bank/components/BankSelector";

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
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [productMasters, setProductMasters] = useState([]);
  const [outletInventory, setOutletInventory] = useState([]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [stockErrors, setStockErrors] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState([{ paymentMode: "cash", amount: "", bankAccountId: "" }]);
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const productNameById = useMemo(() => {
    return Object.fromEntries(productMasters.map((p) => [p.id, p.itemName]));
  }, [productMasters]);

  // Stock lookup by product ID from outlet inventory
  const stockByProductId = useMemo(() => {
    return Object.fromEntries(outletInventory.map((item) => [String(item.productId), Number(item.currentStock || 0)]));
  }, [outletInventory]);

  // Fetch outlet inventory stock when outlet changes
  const refreshOutletInventory = async () => {
    if (!selectedOutlet) return;
    try {
      const items = await fetchOutletInventoryFromAPI({ outletId: selectedOutlet });
      setOutletInventory(items);
    } catch {
      setOutletInventory([]);
    }
  };

  useEffect(() => {
    refreshOutletInventory();
  }, [selectedOutlet]);

  // Load outlets for admin and pre-select first outlet
  useEffect(() => {
    if (isAdmin) {
      fetchOutletsFromAPI().then((outletList) => {
        setOutlets(outletList);
        if (outletList.length > 0 && !selectedOutlet) {
          setSelectedOutlet(outletList[0].id);
        }
      });
    }
  }, [isAdmin]);

  // Set default outlet for non-admin
  useEffect(() => {
    if (!isAdmin && user?.outlet_id) {
      setSelectedOutlet(user.outlet_id);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    const loadPos = async () => {
      try {
        const outletId = isAdmin ? (selectedOutlet || undefined) : user?.outlet_id;
        const [catalogItems, staffList, products] = await Promise.all([
          fetchPOSCatalogFromAPI({ outletId }),
          fetchStaff({ outletId }),
          fetchProductsFromAPI(),
        ]);

        const productMeasureMap = Object.fromEntries(
          products.map((p) => [p.id, p.productMeasureLabel])
        );

        setCatalog(catalogItems.map(item => ({
          ...item,
          measureLabel: item.type === "product" ? productMeasureMap[item.id] : ""
        })));
        setFilteredCatalog(catalogItems.map(item => ({
          ...item,
          measureLabel: item.type === "product" ? productMeasureMap[item.id] : ""
        })));
        setStaffMembers(staffList);
        setProductMasters(products);
      } catch (err) {
        console.error("Failed to load POS catalog:", err);
        toast.error("Failed to load catalog: " + (err.message || "Server error"));
      }
    };

    if (user) {
      loadPos();
    }
  }, [user, isAdmin, selectedOutlet]);

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
          serviceItems: (item.serviceItems || []).map((svc) => ({
            ...svc,
            enabled: true,
            staffId: "",
            productLinkages: (svc.productLinkages || []).map((link) => ({
              ...link,
              currentQty: link.quantityUsed,
              currentUnit: link.consumptionUnit || "primary",
              unitMaster: link.unitMaster || null,
              unitMasterId: link.unitMasterId || null,
              enabled: true,
            })),
          })),
          productLinkages: (item.productLinkages || []).map((link) => ({
            ...link,
            currentQty: link.quantityUsed,
            currentUnit: link.consumptionUnit || "primary",
            unitMaster: link.unitMaster || null,
            unitMasterId: link.unitMasterId || null,
          })),
          quantity: 1,
          staffId: "",
          customPrice: null,
        },
      ];
    });
  };

  const updateLine = (lineId, key, value) => {
    setCart((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, [key]: value } : line)),
    );
  };

  const updateProductLinkageQty = (lineId, inventoryId, delta) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          productLinkages: line.productLinkages.map((link) =>
            link.inventoryId === inventoryId
              ? { ...link, currentQty: Math.max(0, (Number(link.currentQty) || 0) + delta) }
              : link
          ),
        };
      })
    );
  };

  const updateProductLinkageField = (lineId, inventoryId, field, value) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          productLinkages: line.productLinkages.map((link) => {
            if (link.inventoryId !== inventoryId) return link;
            // If switching unit, auto-convert the quantity
            if (field === "currentUnit" && link.unitMaster) {
              const oldUnit = link.currentUnit;
              const newUnit = value;
              if (oldUnit !== newUnit) {
                const ratio = link.unitMaster.conversionRatio;
                let newQty = link.currentQty;
                if (oldUnit === "primary" && newUnit === "secondary") {
                  newQty = (Number(link.currentQty) || 0) * ratio;
                } else if (oldUnit === "secondary" && newUnit === "primary") {
                  newQty = (Number(link.currentQty) || 0) / ratio;
                }
                return { ...link, currentUnit: newUnit, currentQty: Number(newQty.toFixed(4)) };
              }
            }
            return { ...link, [field]: value };
          }),
        };
      })
    );
  };

  const updateLinePrice = (lineId, newPrice) => {
    setCart((current) =>
      current.map((line) =>
        line.lineId === lineId ? { ...line, customPrice: newPrice ? Number(newPrice) : null } : line
      )
    );
  };

  const getLinePrice = (line) => line.customPrice ?? line.price;

  const removeLine = (lineId) => {
    setCart((current) => current.filter((line) => line.lineId !== lineId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setPaymentMethod("");
    setSelectedBankId("");
    setDiscountValue("");
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

  const togglePackageService = (lineId, serviceId) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) =>
            svc.serviceId === serviceId ? { ...svc, enabled: !svc.enabled } : svc
          ),
        };
      })
    );
  };

  const updatePackageServiceField = (lineId, serviceId, field, value) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) =>
            svc.serviceId === serviceId ? { ...svc, [field]: value } : svc
          ),
        };
      })
    );
  };

  const togglePackageServiceProduct = (lineId, serviceId, inventoryId) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) => {
            if (svc.serviceId !== serviceId) return svc;
            return {
              ...svc,
              productLinkages: svc.productLinkages.map((link) =>
                link.inventoryId === inventoryId ? { ...link, enabled: !link.enabled } : link
              ),
            };
          }),
        };
      })
    );
  };

  const updatePackageServiceProductField = (lineId, serviceId, inventoryId, field, value) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) => {
            if (svc.serviceId !== serviceId) return svc;
            return {
              ...svc,
              productLinkages: svc.productLinkages.map((link) => {
                if (link.inventoryId !== inventoryId) return link;
                if (field === "currentUnit" && link.unitMaster) {
                  const oldUnit = link.currentUnit;
                  const newUnit = value;
                  if (oldUnit !== newUnit) {
                    const ratio = link.unitMaster.conversionRatio;
                    let newQty = link.currentQty;
                    if (oldUnit === "primary" && newUnit === "secondary") {
                      newQty = (Number(link.currentQty) || 0) * ratio;
                    } else if (oldUnit === "secondary" && newUnit === "primary") {
                      newQty = (Number(link.currentQty) || 0) / ratio;
                    }
                    return { ...link, currentUnit: newUnit, currentQty: Number(newQty.toFixed(4)) };
                  }
                }
                return { ...link, [field]: value };
              }),
            };
          }),
        };
      })
    );
  };

  const updatePackageServiceProductQty = (lineId, serviceId, inventoryId, delta) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) => {
            if (svc.serviceId !== serviceId) return svc;
            return {
              ...svc,
              productLinkages: svc.productLinkages.map((link) =>
                link.inventoryId === inventoryId
                  ? { ...link, currentQty: Math.max(0, (Number(link.currentQty) || 0) + delta) }
                  : link
              ),
            };
          }),
        };
      })
    );
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

  const subtotal = cart.reduce((sum, line) => sum + getLinePrice(line) * line.quantity, 0);
  const discountAmount = discountValue
    ? discountType === "percent"
      ? Math.min(subtotal, (subtotal * Math.min(100, Number(discountValue))) / 100)
      : Math.min(subtotal, Number(discountValue))
    : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * 0.08;
  const total = discountedSubtotal + tax;

  const hasUnassignedService = cart.some(
    (line) =>
      (line.type === "service" && !line.staffId) ||
      (line.type === "package" && line.serviceItems?.some((svc) => svc.enabled && !svc.staffId))
  );

  // Validate stock for all cart items (only when a specific outlet is selected)
  const stockValidation = useMemo(() => {
    const errors = [];
    if (!selectedOutlet || outletInventory.length === 0 || cart.length === 0) return { errors, hasErrors: false };

    for (const line of cart) {
      // Check direct product sales
      if (line.type === "product") {
        const available = stockByProductId[String(line.id)] ?? 0;
        if (line.quantity > available) {
          errors.push({
            lineId: line.lineId,
            itemName: line.name,
            type: "product",
            required: line.quantity,
            available,
            shortfall: line.quantity - available,
          });
        }
      }

      // Check service product consumptions
      if (line.type === "service" && line.productLinkages?.length > 0) {
        for (const link of line.productLinkages) {
          if (!link.inventoryId || link.currentQty <= 0) continue;
          const totalNeeded = (Number(link.currentQty) || 0) * line.quantity;
          const available = stockByProductId[String(link.inventoryId)] ?? 0;
          if (totalNeeded > available) {
            errors.push({
              lineId: line.lineId,
              itemName: `${line.name} → ${productNameById[link.inventoryId] || link.inventoryId}`,
              type: "service-consumption",
              required: totalNeeded,
              available,
              shortfall: totalNeeded - available,
            });
          }
        }
      }

      // Check package service consumptions (only enabled services + enabled links)
      if (line.type === "package" && line.serviceItems?.length > 0) {
        for (const serviceItem of line.serviceItems) {
          if (!serviceItem.enabled) continue;
          if (!serviceItem.productLinkages?.length) continue;

          for (const link of serviceItem.productLinkages) {
            if (!link.enabled || !link.inventoryId || (Number(link.currentQty) || 0) <= 0) continue;
            const totalNeeded = (Number(link.currentQty) || 0) * Number(serviceItem.sessions || 1) * line.quantity;
            const available = stockByProductId[String(link.inventoryId)] ?? 0;
            if (totalNeeded > available) {
              errors.push({
                lineId: line.lineId,
                itemName: `${line.name} → ${serviceItem.serviceName} → ${productNameById[link.inventoryId] || link.inventoryId}`,
                type: "package-consumption",
                required: totalNeeded,
                available,
                shortfall: totalNeeded - available,
              });
            }
          }
        }
      }
    }

    return { errors, hasErrors: errors.length > 0 };
  }, [cart, stockByProductId, productNameById, selectedOutlet, catalog]);

  // Update stock errors when validation changes
  useEffect(() => {
    setStockErrors(stockValidation.errors);
  }, [stockValidation.errors]);

  // Bank required for any non-cash payment detail row
  const isBankRequired = paymentMethod && paymentMethod !== "Cash";
  const canCheckout = cart.length > 0 && paymentMethod;

  const paymentModeMap = { Cash: "cash", Card: "card", UPI: "upi" };

  const syncPaymentDetailsWithMethod = (method) => {
    const mode = paymentModeMap[method] || "cash";
    setPaymentDetails([{ paymentMode: mode, amount: "", bankAccountId: "" }]);
  };

  const addPaymentDetail = () => {
    setPaymentDetails((prev) => [...prev, { paymentMode: "cash", amount: "", bankAccountId: "" }]);
  };

  const removePaymentDetail = (idx) => {
    setPaymentDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePaymentDetail = (idx, field, value) => {
    setPaymentDetails((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  // Derive the primary bank for the Payment record: first non-cash detail's bank, fallback to selectedBankId
  const primaryBankAccountId = paymentDetails.find((d) => d.paymentMode !== "cash" && d.bankAccountId)?.bankAccountId || selectedBankId || null;

  // isBankRequired: true if any non-cash detail has no bank selected
  const nonCashNeedsBank = paymentMethod && paymentMethod !== "Cash" &&
    paymentDetails.some((d) => d.paymentMode !== "cash" && !d.bankAccountId);

  const handleCheckout = async () => {
    const resolvedDetails = paymentDetails
      .map((d) => ({ paymentMode: d.paymentMode, amount: Number(d.amount) || 0, bankAccountId: d.bankAccountId || null }))
      .filter((d) => d.amount > 0);

    const payload = {
      customer,
      paymentMethod,
      bankId: primaryBankAccountId,
      bankAccountId: primaryBankAccountId,
      outletId: selectedOutlet || user?.outlet_id || "all_outlets",
      subtotal,
      discountType: discountAmount > 0 ? discountType : null,
      discountValue: discountAmount > 0 ? Number(discountValue) : 0,
      discountAmount,
      tax,
      total,
      paymentDetails: resolvedDetails.length > 0 ? resolvedDetails : undefined,
      transactionReference: transactionReference.trim() || undefined,
      paymentNotes: paymentNotes.trim() || undefined,
      lineItems: cart.map((line) => ({
        itemId: line.id,
        itemType: line.type,
        itemName: line.name,
        qty: line.quantity,
        price: getLinePrice(line),
        staffAssigned: line.type === "service" ? line.staffId : null,
        productConsumption:
          line.type === "service" && line.productLinkages?.length > 0
            ? line.productLinkages
              .filter((link) => link.inventoryId)
              .map((link) => ({
                productId: link.inventoryId,
                qty: (Number(link.currentQty) || 0) * line.quantity,
                unit: link.currentUnit || "primary",
              }))
            : undefined,
        includedServices:
          line.type === "package"
            ? line.serviceItems
                .filter((svc) => svc.enabled)
                .map((svc) => ({
                  serviceId: svc.serviceId,
                  serviceName: svc.serviceName,
                  sessions: svc.sessions,
                  staffAssigned: svc.staffId || null,
                  productConsumption: (svc.productLinkages || [])
                    .filter((link) => link.enabled && link.inventoryId && (Number(link.currentQty) || 0) > 0)
                    .map((link) => ({
                      productId: link.inventoryId,
                      qty: (Number(link.currentQty) || 0) * line.quantity,
                      unit: link.currentUnit || "primary",
                    })),
                }))
            : undefined,
      })),
    };

    const result = await checkoutBillAPI(payload);
    setCurrentBill(result);
    setShowInvoice(true);
    setCart([]);
    setPaymentMethod("");
    setSelectedBankId("");
    setDiscountValue("");
    setCustomer({ name: "", phone: "" });
    setPaymentDetails([{ paymentMode: "cash", amount: "", bankAccountId: "" }]);
    setTransactionReference("");
    setPaymentNotes("");
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
            <div className="flex items-center gap-3">
              {isAdmin && (
                <select
                  className="premium-input !py-1.5 !px-3 !text-xs appearance-none min-w-[140px]"
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                >
                  <option value="">All Outlets</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-xs font-semibold text-slate-400">{filteredCatalog.length} items</span>
            </div>
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
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${activeCategory === category
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
                    className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${item.type === "service"
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

                <p className="text-sm font-bold text-navy-900 leading-snug">
                  {item.name} {item.measureLabel && <span className="text-navy-400 font-normal ml-1">({item.measureLabel})</span>}
                </p>

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

                <div className="mt-2 flex items-center gap-2">
                  {item.totalOriginalPrice > item.price && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatCurrency(item.totalOriginalPrice)}
                    </span>
                  )}
                  <span className="text-sm font-black text-navy-800">
                    {formatCurrency(item.price)}
                  </span>
                </div>
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
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {cart.map((line) => (
                  <div key={line.lineId} className="rounded-xl border border-navy-200 bg-white p-4 shadow-sm">
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

                    {line.type === "service" && (
                      <>
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

                        {/* Products used in service — editable measurements */}
                        {line.productLinkages && line.productLinkages.length > 0 && (
                          <div className="mt-3 space-y-2 rounded-lg bg-navy-50 p-3 border border-navy-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-navy-500">Product Consumption</p>
                            {line.productLinkages.map((link) => {
                              const finalQty = Math.max(0, Number(link.currentQty) || 0);
                              const um = link.unitMaster;
                              const unitAbbr = um ? getUnitAbbr(um, link.currentUnit || 'primary') : '';
                              const unitOptions = um ? getAvailableUnits(um) : [];
                              const showConversion = um && link.currentUnit === 'secondary' && finalQty > 0;
                              const baseEquiv = showConversion
                                ? convertToBase(finalQty, um.conversionRatio, 'secondary')
                                : null;

                              return (
                                <div key={link.inventoryId} className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-navy-700 truncate flex-1">
                                      {productNameById[link.inventoryId] || link.inventoryId}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => updateProductLinkageQty(line.lineId, link.inventoryId, link.currentUnit === 'secondary' ? -1 : -0.1)}
                                        className="flex h-5 w-5 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                        disabled={finalQty <= 0}
                                      >
                                        <Minus className="h-2.5 w-2.5" />
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={finalQty}
                                        onChange={(e) => updateProductLinkageField(line.lineId, link.inventoryId, 'currentQty', Number(e.target.value) || 0)}
                                        className="w-16 text-center text-xs font-semibold text-navy-700 border border-navy-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-navy-400"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updateProductLinkageQty(line.lineId, link.inventoryId, link.currentUnit === 'secondary' ? 1 : 0.1)}
                                        className="flex h-5 w-5 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                      </button>
                                      {unitOptions.length > 0 ? (
                                        <select
                                          className="text-[10px] font-semibold text-navy-600 bg-white border border-navy-200 rounded px-1 py-0.5 appearance-none"
                                          value={link.currentUnit || 'primary'}
                                          onChange={(e) => updateProductLinkageField(line.lineId, link.inventoryId, 'currentUnit', e.target.value)}
                                        >
                                          {unitOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                          ))}
                                        </select>
                                      ) : null}
                                    </div>
                                  </div>
                                  {showConversion && baseEquiv !== null ? (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-1">
                                      <ArrowLeftRight className="h-2.5 w-2.5" />
                                      <span>= {baseEquiv.toFixed(4).replace(/\.?0+$/, '')} {um.primaryAbbr}</span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {/* Package: services + linked products */}
                    {line.type === "package" && line.serviceItems?.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-xl border border-gold-200 bg-gold-50/40 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gold-700">Included Services</p>
                        {line.serviceItems.map((svc) => (
                          <div key={svc.serviceId} className={`rounded-lg border bg-white p-2.5 transition-opacity ${svc.enabled ? "border-navy-200 opacity-100" : "border-slate-100 opacity-50"}`}>
                            {/* Service header row */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => togglePackageService(line.lineId, svc.serviceId)}
                                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${svc.enabled ? "bg-navy-700" : "bg-slate-300"}`}
                              >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${svc.enabled ? "translate-x-3" : "translate-x-0"}`} />
                              </button>
                              <span className="flex-1 text-xs font-bold text-navy-800 truncate">
                                {svc.serviceName}
                                {svc.sessions > 1 && <span className="ml-1 text-[10px] text-navy-400 font-normal">×{svc.sessions}</span>}
                              </span>
                            </div>

                            {/* Staff assignment per service */}
                            {svc.enabled && (
                              <div className="mt-2 flex items-center gap-1.5">
                                <select
                                  className="premium-input !py-1.5 !px-2 !text-xs appearance-none flex-1"
                                  value={svc.staffId || ""}
                                  onChange={(e) => updatePackageServiceField(line.lineId, svc.serviceId, "staffId", e.target.value)}
                                >
                                  <option value="">Assign Talent</option>
                                  {staffMembers.map((member) => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                  ))}
                                </select>
                                {svc.staffId && (
                                  <button
                                    type="button"
                                    onClick={() => updatePackageServiceField(line.lineId, svc.serviceId, "staffId", "")}
                                    className="rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Linked products per service */}
                            {svc.enabled && svc.productLinkages?.length > 0 && (
                              <div className="mt-2 space-y-1.5 rounded-lg bg-navy-50 p-2 border border-navy-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-navy-400">Product Consumption</p>
                                {svc.productLinkages.map((link) => {
                                  const finalQty = Math.max(0, Number(link.currentQty) || 0);
                                  const um = link.unitMaster;
                                  const unitOptions = um ? getAvailableUnits(um) : [];
                                  const showConv = um && link.currentUnit === "secondary" && finalQty > 0;
                                  const baseEquiv = showConv ? convertToBase(finalQty, um.conversionRatio, "secondary") : null;
                                  return (
                                    <div key={link.inventoryId} className={`space-y-0.5 transition-opacity ${link.enabled ? "opacity-100" : "opacity-40"}`}>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => togglePackageServiceProduct(line.lineId, svc.serviceId, link.inventoryId)}
                                          className={`relative inline-flex h-3.5 w-6 shrink-0 rounded-full border-2 border-transparent transition-colors ${link.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                                        >
                                          <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform ${link.enabled ? "translate-x-2.5" : "translate-x-0"}`} />
                                        </button>
                                        <span className="flex-1 text-[11px] text-navy-700 truncate">
                                          {productNameById[link.inventoryId] || link.inventoryId}
                                        </span>
                                        {link.enabled && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => updatePackageServiceProductQty(line.lineId, svc.serviceId, link.inventoryId, link.currentUnit === "secondary" ? -1 : -0.1)}
                                              disabled={finalQty <= 0}
                                              className="flex h-4 w-4 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                            >
                                              <Minus className="h-2 w-2" />
                                            </button>
                                            <input
                                              type="number"
                                              min="0"
                                              step="any"
                                              value={finalQty}
                                              onChange={(e) => updatePackageServiceProductField(line.lineId, svc.serviceId, link.inventoryId, "currentQty", Number(e.target.value) || 0)}
                                              className="w-12 text-center text-[11px] font-semibold text-navy-700 border border-navy-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-navy-400"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => updatePackageServiceProductQty(line.lineId, svc.serviceId, link.inventoryId, link.currentUnit === "secondary" ? 1 : 0.1)}
                                              className="flex h-4 w-4 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                            >
                                              <Plus className="h-2 w-2" />
                                            </button>
                                            {unitOptions.length > 0 && (
                                              <select
                                                className="text-[10px] font-semibold text-navy-600 bg-white border border-navy-200 rounded px-1 py-0.5 appearance-none"
                                                value={link.currentUnit || "primary"}
                                                onChange={(e) => updatePackageServiceProductField(line.lineId, svc.serviceId, link.inventoryId, "currentUnit", e.target.value)}
                                              >
                                                {unitOptions.map((opt) => (
                                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                              </select>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {showConv && baseEquiv !== null && (
                                        <div className="flex items-center gap-1 text-[9px] text-slate-400 pl-6">
                                          <ArrowLeftRight className="h-2 w-2" />
                                          <span>= {baseEquiv.toFixed(4).replace(/\.?0+$/, "")} {um.primaryAbbr}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Editable price for services with products */}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-navy-300">Price</span>
                        <input
                          type="number"
                          min="0"
                          className="w-24 px-2 py-1 text-xs font-semibold text-navy-700 bg-white border border-navy-200 rounded-lg focus:outline-none focus:border-navy-400"
                          value={getLinePrice(line)}
                          onChange={(e) => updateLinePrice(line.lineId, e.target.value)}
                        />
                      </div>
                      <span className="text-xs font-bold text-navy-600">
                        × {line.quantity} = {formatCurrency(getLinePrice(line) * line.quantity)}
                      </span>
                    </div>
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
            {/* Discount Row */}
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-gold-500 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">Discount</span>
              <div className="flex flex-1 items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => { setDiscountType("percent"); setDiscountValue(""); }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                    discountType === "percent"
                      ? "bg-navy-900 text-white"
                      : "border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => { setDiscountType("flat"); setDiscountValue(""); }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                    discountType === "flat"
                      ? "bg-navy-900 text-white"
                      : "border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                  }`}
                >
                  RM
                </button>
                <input
                  type="number"
                  min="0"
                  max={discountType === "percent" ? 100 : undefined}
                  placeholder={discountType === "percent" ? "0–100" : "Amount"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-20 rounded-lg border border-navy-200 bg-white px-2 py-1 text-xs font-semibold text-navy-700 focus:outline-none focus:border-navy-400"
                />
              </div>
            </div>

            <div className="space-y-2 text-sm font-medium text-navy-800">
              <div className="flex items-center justify-between opacity-60">
                <span>Subtotal</span>
                <span className="font-bold">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Discount {discountType === "percent" ? `(${discountValue}%)` : "(Flat)"}</span>
                  <span className="font-bold">− {formatCurrency(discountAmount)}</span>
                </div>
              )}
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
                  onClick={() => {
                    setPaymentMethod(method);
                    syncPaymentDetailsWithMethod(method);
                    if (method === "Cash") {
                      setSelectedBankId("");
                    }
                  }}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* Split Payment Details */}
            {paymentMethod && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-navy-400 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Payment Breakdown
                  </span>
                  <button
                    type="button"
                    onClick={addPaymentDetail}
                    className="text-[10px] font-black uppercase tracking-widest text-gold-600 hover:text-gold-700"
                  >
                    + Add Method
                  </button>
                </div>
                {paymentDetails.map((detail, idx) => (
                  <div key={idx} className="space-y-1.5 rounded-xl border border-navy-100 bg-white p-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={detail.paymentMode}
                        onChange={(e) => {
                          updatePaymentDetail(idx, "paymentMode", e.target.value);
                          if (e.target.value === "cash") updatePaymentDetail(idx, "bankAccountId", "");
                        }}
                        className="flex-1 rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs font-semibold text-navy-700 focus:outline-none focus:border-navy-400"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={detail.amount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const otherTotal = paymentDetails.reduce((s, d, i) => i === idx ? s : s + (Number(d.amount) || 0), 0);
                          const capped = Math.min(val, total - otherTotal);
                          updatePaymentDetail(idx, "amount", capped >= 0 ? capped : 0);
                        }}
                        className="w-24 rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs font-semibold text-navy-700 text-right focus:outline-none focus:border-navy-400"
                      />
                      {paymentDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentDetail(idx)}
                          className="text-rose-400 hover:text-rose-600 flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {detail.paymentMode !== "cash" && (
                      <BankSelector
                        value={detail.bankAccountId || ""}
                        onChange={(v) => updatePaymentDetail(idx, "bankAccountId", v)}
                        label=""
                        required={false}
                        placeholder="Select bank account"
                        showDefaultIndicator={true}
                      />
                    )}
                  </div>
                ))}
                {/* Running total vs bill total */}
                {(() => {
                  const entered = paymentDetails.reduce((s, d) => s + (Number(d.amount) || 0), 0);
                  const balance = total - entered;
                  if (entered === 0) return null;
                  return (
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      balance === 0 ? "text-emerald-600" : balance > 0 ? "text-amber-500" : "text-rose-500"
                    }`}>
                      {balance === 0 ? "Fully covered" : balance > 0 ? `Due: ${balance.toFixed(2)}` : `Overpaid: ${Math.abs(balance).toFixed(2)}`}
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Transaction Ref + Notes */}
            {paymentMethod && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Transaction ref (optional)"
                  className="w-full rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-700 placeholder:text-slate-400 focus:outline-none focus:border-navy-400"
                />
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment notes (optional)"
                  className="w-full rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-700 placeholder:text-slate-400 focus:outline-none focus:border-navy-400"
                />
              </div>
            )}

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

            {cart.length > 0 && nonCashNeedsBank && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Select a bank account for each non-cash payment row</span>
              </div>
            )}

            {hasUnassignedService && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Talent not assigned — you can still proceed</span>
              </div>
            )}

            {/* Stock Validation Warnings */}
            {stockErrors.length > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs font-black uppercase tracking-widest text-amber-700">Stock Warning</span>
                </div>
                <p className="text-[11px] text-amber-600 mb-1.5">Some items have low stock. You can still proceed.</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {stockErrors.map((error, idx) => (
                    <div key={idx} className="text-[11px] text-amber-700 leading-tight">
                      <span className="font-semibold">{error.itemName}</span>: need {error.required}, have {error.available}
                      <span className="text-amber-500"> (short {error.shortfall})</span>
                    </div>
                  ))}
                </div>
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
