import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Scissors, Calendar, User, Store, X } from "lucide-react";
import { fetchProductsFromAPI, fetchBillsFromAPI, fetchServicesFromAPI } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";

export function ProductSaleHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [product, setProduct] = useState(null);
  const [saleHistory, setSaleHistory] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [isConnectedServicesModalOpen, setIsConnectedServicesModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredHistory = useMemo(() => {
    return saleHistory.filter((record) => {
      if (!record.createdAt) return true;
      const recordDate = new Date(record.createdAt);
      const checkDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());

      if (startDate) {
        const start = new Date(startDate);
        const startCompare = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        if (checkDate < startCompare) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        const endCompare = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (checkDate > endCompare) return false;
      }

      return true;
    });
  }, [saleHistory, startDate, endDate]);

  const connectedServices = useMemo(() => {
    if (!product || !servicesList) return [];
    return servicesList.filter((service) => {
      const linkages = service.productLinkages || service.product_linkages || [];
      return linkages.some(
        (linkage) =>
          String(linkage.inventoryId || linkage.inventory_id) === String(product.id)
      );
    });
  }, [product, servicesList]);

  const getProductQuantityUsed = (service) => {
    if (!product) return null;
    const linkages = service.productLinkages || service.product_linkages || [];
    const linkage = linkages.find(
      (l) => String(l.inventoryId || l.inventory_id) === String(product.id)
    );
    if (!linkage) return null;
    
    let unitAbbr = linkage.consumptionUnit || linkage.consumption_unit || 'primary';
    if (product.unitMaster) {
      if (unitAbbr === 'secondary') {
        unitAbbr = product.unitMaster.secondaryAbbr;
      } else if (unitAbbr === 'primary') {
        unitAbbr = product.unitMaster.primaryAbbr;
      }
    }
    return `${linkage.quantityUsed ?? linkage.quantity_used} ${unitAbbr}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [products, bills, services] = await Promise.all([
          fetchProductsFromAPI(),
          fetchBillsFromAPI(isAdmin ? {} : { outletId: user?.outlet_id }),
          fetchServicesFromAPI(),
        ]);

        const foundProduct = products.find((p) => String(p.id) === String(id));
        if (!foundProduct) {
          setError("Product not found.");
          return;
        }
        setProduct(foundProduct);
        setServicesList(services);

        const historyItems = [];
        bills.forEach((bill) => {
          const items = bill.lineItems || [];
          items.forEach((item) => {
            const type = item.itemType || item.item_type;
            const itemId = item.itemId || item.item_id;
            const name = item.itemName || item.item_name;
            const consumption = item.productConsumption || item.product_consumption;

            // Case 1: Product was sold directly
            if (type === 'product' && String(itemId) === String(id)) {
              let unitAbbr = '';
              if (consumption && consumption.abbr) {
                unitAbbr = consumption.abbr;
              } else if (foundProduct.unitMaster) {
                const unitRole = (consumption && consumption.unit) || 'primary';
                if (unitRole === 'secondary') {
                  unitAbbr = foundProduct.unitMaster.secondaryAbbr || foundProduct.unitMaster.secondary_abbr;
                } else {
                  unitAbbr = foundProduct.unitMaster.primaryAbbr || foundProduct.unitMaster.primary_abbr;
                }
              }

              historyItems.push({
                billId: bill.id,
                billNumber: bill.billNumber || bill.bill_number,
                createdAt: bill.createdAt || bill.created_at,
                customerName: bill.customer?.name || 'Walk-in Customer',
                outletName: bill.Outlet?.name || bill.outletName || 'Default Outlet',
                soldAs: 'Direct Sale',
                qty: item.qty,
                unit: unitAbbr,
                price: Number(item.price),
                total: Number(item.price) * Number(item.qty),
              });
            }
            // Case 2: Product was consumed as part of a service
            else if (type === 'service' && consumption) {
              const consumptions = Array.isArray(consumption) ? consumption : [];
              const matchingConsumption = consumptions.find(
                (c) => String(c.productId || c.inventoryId || c.inventory_id) === String(id)
              );
              if (matchingConsumption) {
                let unitAbbr = matchingConsumption.unit || matchingConsumption.consumptionUnit || 'primary';
                if (foundProduct.unitMaster) {
                  if (unitAbbr === 'secondary') {
                    unitAbbr = foundProduct.unitMaster.secondaryAbbr || foundProduct.unitMaster.secondary_abbr;
                  } else if (unitAbbr === 'primary') {
                    unitAbbr = foundProduct.unitMaster.primaryAbbr || foundProduct.unitMaster.primary_abbr;
                  }
                }

                historyItems.push({
                  billId: bill.id,
                  billNumber: bill.billNumber || bill.bill_number,
                  createdAt: bill.createdAt || bill.created_at,
                  customerName: bill.customer?.name || 'Walk-in Customer',
                  outletName: bill.Outlet?.name || bill.outletName || 'Default Outlet',
                  soldAs: 'Consumed in Service',
                  serviceName: name,
                  serviceId: itemId,
                  qty: matchingConsumption.qty || matchingConsumption.quantityUsed || 1,
                  unit: unitAbbr,
                  price: Number(item.price), // Service price
                  servicePrice: Number(item.price),
                });
              }
            }
          });
        });

        // Sort by date descending
        historyItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSaleHistory(historyItems);
      } catch (err) {
        console.error("Failed to load product sale history:", err);
        setError("Failed to load sale history record.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, isAdmin, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading sale history...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <p className="font-semibold text-lg">Error occurred</p>
          <p className="mt-2 text-sm">{error || "Product not found."}</p>
          <button
            type="button"
            onClick={() => navigate("/inventory")}
            className="mt-6 btn-premium-primary"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation and Title header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate("/inventory")}
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-navy-950 transition-colors"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Inventory
          </button>
          <h1 className="mt-3 text-4xl font-bold text-navy-900 leading-tight">Product Sale History</h1>
          <p className="text-sm text-slate-500">
            View detailed sales and service utilization log for <span className="font-semibold text-navy-950">{product.itemName}</span>
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Product Details Card */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-400">Product Info</p>
              <h3 className="mt-2 text-2xl font-bold text-navy-900">{product.itemName}</h3>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Base Price</span>
                <span className="font-bold text-navy-900">{formatCurrency(product.unitPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Unit Group</span>
                <span className="font-bold text-navy-900">
                  {product.unitMaster
                    ? `${product.unitMaster.primaryAbbr} ↔ ${product.unitMaster.secondaryAbbr}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Central Stock</span>
                <span className="font-bold text-navy-900">
                  {product.unitMaster && product.consumptionUnit === 'secondary'
                    ? (Number(product.centralStock) * product.unitMaster.conversionRatio).toFixed(4).replace(/\.?0+$/, "")
                    : product.centralStock}
                  {product.unitMaster ? ` ${product.consumptionUnit === 'secondary' ? product.unitMaster.secondaryAbbr : product.unitMaster.primaryAbbr}` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Issued to Outlets</span>
                <span className="font-bold text-navy-900">
                  {product.unitMaster && product.consumptionUnit === 'secondary'
                    ? (Number(product.issuedStock) * product.unitMaster.conversionRatio).toFixed(4).replace(/\.?0+$/, "")
                    : product.issuedStock}
                  {product.unitMaster ? ` ${product.consumptionUnit === 'secondary' ? product.unitMaster.secondaryAbbr : product.unitMaster.primaryAbbr}` : ""}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsConnectedServicesModalOpen(true)}
                className="w-full btn-premium-outline flex items-center justify-center gap-2"
              >
                <Scissors size={14} />
                View Linked Services
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Sales Transactions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xl font-bold text-navy-900">Transactions ({filteredHistory.length})</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-500 font-medium">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="premium-input !py-1 !px-2 !text-xs max-w-[140px]"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-500 font-medium">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="premium-input !py-1 !px-2 !text-xs max-w-[140px]"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-xs text-slate-400 hover:text-navy-950 underline font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="space-y-4">
              {filteredHistory.map((record, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Card Header row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          record.soldAs === 'Direct Sale'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {record.soldAs === 'Direct Sale' ? (
                          <ShoppingBag size={12} />
                        ) : (
                          <Scissors size={12} />
                        )}
                        {record.soldAs}
                      </span>
                      <span className="text-xs font-bold text-navy-900 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                        {record.billNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/pos/bills/${record.billId}`)}
                        className="px-2 py-0.5 text-[10px] font-black text-gold-600 hover:text-gold-700 hover:bg-gold-50 border border-gold-200 rounded-md transition-colors uppercase tracking-wider"
                      >
                        View Invoice
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar size={12} />
                      <span>
                        {new Date(record.createdAt).toLocaleDateString("en-US", {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Transaction metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-slate-400 font-medium">Customer</p>
                        <p className="font-bold text-navy-900 mt-0.5">{record.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store size={14} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-slate-400 font-medium">Outlet</p>
                        <p className="font-bold text-navy-900 mt-0.5">{record.outletName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Details area */}
                  <div className="mt-4 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                    {record.soldAs === 'Direct Sale' ? (
                      <>
                        <div className="text-xs">
                          <p className="text-slate-400 font-medium">Sale details</p>
                          <p className="text-navy-900 font-medium mt-0.5">
                            Qty: <span className="font-bold">{record.qty} {record.unit}</span> • Price: <span className="font-bold">{formatCurrency(record.price)}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Total Sale</p>
                          <p className="text-base font-black text-navy-900 mt-0.5">
                            {formatCurrency(record.total)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs flex-1">
                          <p className="text-slate-400 font-medium">Usage in Service</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/services/${record.serviceId}`)}
                            className="mt-0.5 font-bold text-navy-900 hover:text-gold-600 transition-colors flex items-center gap-1.5 text-left group/btn"
                          >
                            <span>{record.serviceName}</span>
                            <Scissors size={10} className="text-slate-400 group-hover/btn:text-gold-600 transition-colors" />
                          </button>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Product Qty</p>
                          <p className="text-sm font-black text-navy-900 mt-0.5">
                            {record.qty} {record.unit}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
              <p className="mt-3 font-semibold text-navy-900">
                {startDate || endDate ? "No Transactions in Range" : "No Sales Records Found"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {startDate || endDate
                  ? "Adjust or clear your date filters to see other records."
                  : "No sales history has been recorded for this product yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Connected Services Modal */}
      {isConnectedServicesModalOpen && product ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-3xl text-navy-900 font-bold">Connected Services</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Services linked to <span className="font-semibold text-navy-800">{product.itemName}</span>
                </p>
              </div>
              <button
                type="button"
                className="btn-premium-outline !p-2 rounded-full flex-shrink-0"
                onClick={() => setIsConnectedServicesModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-4 custom-scrollbar pr-1 pb-4">
              {connectedServices.length > 0 ? (
                <div className="space-y-3">
                  {connectedServices.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => {
                        setIsConnectedServicesModalOpen(false);
                        navigate(`/services/${service.id}`);
                      }}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-gold-300 hover:bg-gold-50/10 cursor-pointer transition-all group/item"
                      title="Click to view service details"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-600 group-hover/item:bg-gold-500 group-hover/item:text-navy-950 transition-colors">
                          <Scissors className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-navy-900 group-hover/item:text-gold-600 transition-colors">{service.serviceName || service.service_name}</p>
                          <p className="text-xs text-slate-500">
                            Duration: {service.duration} mins • Base Price: {formatCurrency(service.price)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-600 group-hover/item:bg-gold-100 group-hover/item:text-gold-900 transition-colors">
                          Qty: {getProductQuantityUsed(service)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <Scissors className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
                  <p className="mt-3 font-semibold text-navy-900">No Services Linked</p>
                  <p className="mt-1 text-sm text-slate-500">
                    This product is not linked to any services yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
