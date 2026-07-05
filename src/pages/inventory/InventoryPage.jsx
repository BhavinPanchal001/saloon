import { useEffect, useMemo, useState } from "react";
import { X, ArrowLeftRight, Pencil, Trash2, Tag, Images, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { ImageUpload } from "../../components/ui/ImageUpload";
import { AuditHistoryButton, AuditHistoryModal } from "../../components/audit";
import {
  createProductAPI,
  fetchProductsFromAPI,
  updateProductAPI,
  deleteProductAPI,
} from "../../services/api";
import {
  fetchUnitMastersFromAPI,
  fetchOutletsFromAPI,
  fetchServicesFromAPI,
  fetchPackagesFromAPI,
  fetchPurchaseOrdersFromAPI,
  createPurchaseOrderAPI,
  fetchOutletInventoryFromAPI,
  issueProductToOutletAPI,
  fetchOutletProductPricesFromAPI,
  saveOutletProductPriceAPI,
  deleteOutletProductPriceAPI,
} from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";
import { getAvailableUnits, getUnitAbbr, convertToBase, convertFromBase } from "../../utils/unitConversion";

const initialProductForm = {
  itemName: "",
  unitPrice: "",
  openingStock: "",
  unitMasterId: "",
  purchaseUnit: "primary",
  consumptionUnit: "primary",
  productMeasure: 1,
  productMeasureUnit: "primary",
  images: [],
};

const initialPoForm = {
  supplierName: "",
  productId: "",
  qty: 1,
  unit: "primary",
  totalCost: "",
};

const initialIssueForm = {
  productId: "",
  outletId: "",
  qty: 1,
  sellingPrice: "",
};

const initialOutletPriceForm = {
  type: "service",
  outletId: "",
  serviceId: "",
  packageId: "",
  productId: "",
  price: "",
};

export function InventoryPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const scopedOutletId = isAdmin ? "" : user?.outlet_id || "";

  const [activeTab, setActiveTab] = useState("product_master");
  const [outletFilter, setOutletFilter] = useState("");
  const [productMasters, setProductMasters] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [unitMasterList, setUnitMasterList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [outletPrices, setOutletPrices] = useState([]);
  const [outletPriceFilter, setOutletPriceFilter] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isOutletPriceModalOpen, setIsOutletPriceModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProductForm, setEditProductForm] = useState(initialProductForm);
  const [editingOutletPrice, setEditingOutletPrice] = useState(null);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [poForm, setPoForm] = useState(initialPoForm);
  const [issueForm, setIssueForm] = useState(initialIssueForm);
  const [outletPriceForm, setOutletPriceForm] = useState(initialOutletPriceForm);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Audit history state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditEntity, setAuditEntity] = useState({ type: null, id: null, name: null });

  const openLightbox = (images, index = 0) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const openAuditHistory = (entityType, entityId, entityName) => {
    setAuditEntity({ type: entityType, id: entityId, name: entityName });
    setAuditModalOpen(true);
  };

  const loadInventoryPage = async () => {
    try {
      const [productList, inventoryItems, outletList, unitMasters, serviceList, packageList, priceList] = await Promise.all([
        fetchProductsFromAPI(),
        fetchOutletInventoryFromAPI(isAdmin ? {} : { outletId: user?.outlet_id }),
        fetchOutletsFromAPI(),
        fetchUnitMastersFromAPI({ status: 'active' }),
        fetchServicesFromAPI(),
        fetchPackagesFromAPI(),
        fetchOutletProductPricesFromAPI(),
      ]);

      console.log('[Inventory] Loaded outlets:', outletList);

      // Calculate issued stock for each product
      console.log('[Inventory] Inventory items structure:', inventoryItems);
      console.log('[Inventory] Products structure:', productList);
      
      const productsWithIssuedStock = productList.map(product => {
        const matchingItems = inventoryItems.filter(item => item.productId === product.id);
        console.log(`[Inventory] Product ${product.id} (${product.itemName}) - matching inventory items:`, matchingItems);
        
        const issuedStock = matchingItems
          .reduce((total, item) => {
            console.log(`[Inventory] Item details:`, {
              productId: item.productId,
              currentStock: item.currentStock,
              currentStockType: typeof item.currentStock,
              parsedValue: parseFloat(item.currentStock)
            });
            return total + (parseFloat(item.currentStock) || 0);
          }, 0);
        
        console.log(`[Inventory] Product ${product.id} (${product.itemName}) - calculated issuedStock:`, issuedStock);
        
        return {
          ...product,
          issuedStock,
          totalNetworkStock: product.centralStock + issuedStock
        };
      });

      setProductMasters(productsWithIssuedStock);
      setInventory(inventoryItems);
      setOutlets(outletList || []);
      setUnitMasterList(unitMasters.map((u) => ({
        id: u.id,
        groupName: u.group_name,
        primaryUnit: u.primary_unit,
        primaryAbbr: u.primary_abbr,
        secondaryUnit: u.secondary_unit,
        secondaryAbbr: u.secondary_abbr,
        conversionRatio: Number(u.conversion_ratio),
        status: u.status,
      })));
      setServicesList(serviceList);
      setPackagesList(packageList);
      setOutletPrices(priceList);
    } catch (err) {
      console.error('[Inventory] Failed to load data:', err);
      setErrorMessage('Failed to load inventory data: ' + (err.message || 'Unknown error'));
    }
  };

  useEffect(() => {
    if (user) {
      loadInventoryPage();
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (outlets.length > 0) {
      const defaultOutletId = isAdmin ? outlets[0].id : user?.outlet_id || outlets[0].id;
      setIssueForm((current) => ({
        ...current,
        outletId: defaultOutletId,
      }));
    }
  }, [outlets, isAdmin, user?.outlet_id]);

  const outletNameById = useMemo(
    () => Object.fromEntries(outlets.map((outlet) => [outlet.id, outlet.name])),
    [outlets],
  );

  const selectedPoProduct = useMemo(
    () => productMasters.find((item) => item.id === poForm.productId),
    [poForm.productId, productMasters],
  );

  const selectedPoUnitMaster = useMemo(
    () => selectedPoProduct?.unitMaster || null,
    [selectedPoProduct],
  );

  const selectedProductUnitMaster = useMemo(
    () => unitMasterList.find((u) => u.id === productForm.unitMasterId) || null,
    [productForm.unitMasterId, unitMasterList],
  );

  const selectedEditProductUnitMaster = useMemo(
    () => unitMasterList.find((u) => u.id === Number(editProductForm.unitMasterId)) || null,
    [editProductForm.unitMasterId, unitMasterList],
  );

  const openEditProduct = (item) => {
    setEditingProduct(item);
    setEditProductForm({
      itemName: item.itemName,
      unitPrice: String(item.unitPrice),
      openingStock: String(item.centralStock ?? ""),
      unitMasterId: item.unitMaster?.id ?? item.unit_master_id ?? "",
      purchaseUnit: item.purchaseUnit || "primary",
      consumptionUnit: item.consumptionUnit || "primary",
      productMeasure: item.productMeasure || 1,
      productMeasureUnit: item.productMeasureUnit || "primary",
      images: Array.isArray(item.images) ? item.images : [],
    });
    setIsEditProductModalOpen(true);
  };

  const handleEditProductSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    try {
      await updateProductAPI(editingProduct.id, {
        item_name: editProductForm.itemName,
        unit_price: editProductForm.unitPrice,
        unit_master_id: editProductForm.unitMasterId || null,
        purchase_unit: editProductForm.purchaseUnit,
        consumption_unit: editProductForm.consumptionUnit,
        product_measure: editProductForm.productMeasure,
        product_measure_unit: editProductForm.productMeasureUnit,
        images: editProductForm.images || [],
      });
      setIsEditProductModalOpen(false);
      setFeedback("Product updated successfully.");
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to update product.");
    }
  };

  const handleDeleteProduct = async (item) => {
    if (!window.confirm(`Delete "${item.itemName}"? This cannot be undone.`)) return;
    resetMessages();
    try {
      await deleteProductAPI(item.id);
      setFeedback(`"${item.itemName}" deleted.`);
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete product.");
    }
  };

  const selectedIssueProduct = useMemo(
    () => productMasters.find((item) => item.id === issueForm.productId),
    [issueForm.productId, productMasters],
  );

  const resetMessages = () => {
    setFeedback("");
    setErrorMessage("");
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    try {
      await createProductAPI({
        ...productForm,
        unitMasterId: productForm.unitMasterId || null,
      });
      setProductForm(initialProductForm);
      setIsProductModalOpen(false);
      setFeedback("Product master created. You can now raise a purchase order against it.");
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to create product master.");
    }
  };

  const handlePoChange = (event) => {
    const { name, value } = event.target;

    setPoForm((current) => {
      const next = { ...current, [name]: value };
      const selectedItem = productMasters.find(
        (item) => item.id === (name === "productId" ? value : current.productId),
      );
      const qtyValue = Number(name === "qty" ? value : current.qty);

      if ((name === "productId" || name === "qty") && selectedItem && qtyValue > 0) {
        next.totalCost = String(selectedItem.unitPrice * qtyValue);
      }

      if ((name === "productId" || name === "qty") && (!selectedItem || qtyValue <= 0)) {
        next.totalCost = "";
      }

      return next;
    });
  };

  const handlePoSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    try {
      // Transform single-product form data to backend expected format
      const qty = Number(poForm.qty) || 1;
      const totalCost = Number(poForm.totalCost) || 0;
      const unitPrice = qty > 0 ? totalCost / qty : 0;
      await createPurchaseOrderAPI({
        supplierName: poForm.supplierName,
        items: [{
          productId: poForm.productId,
          qty: qty,
          unitPrice: unitPrice,
        }],
        taxRate: 0,
      });
      setPoForm(initialPoForm);
      setIsPoModalOpen(false);
      setFeedback("Purchase order recorded and stock moved into central inventory.");
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to create purchase order.");
    }
  };

  const filteredInventory = useMemo(() => {
    if (!outletFilter) return inventory;
    return inventory.filter((item) => String(item.outletId) === String(outletFilter));
  }, [inventory, outletFilter]);

  const filteredOutletPrices = useMemo(() => {
    if (!outletPriceFilter) return outletPrices;
    return outletPrices.filter((r) => String(r.outletId) === String(outletPriceFilter));
  }, [outletPrices, outletPriceFilter]);

  const outletPriceFormItemId = outletPriceForm.type === "service"
    ? outletPriceForm.serviceId
    : outletPriceForm.type === "package"
      ? outletPriceForm.packageId
      : outletPriceForm.productId;

  const outletPriceFormBasePrice = useMemo(() => {
    if (outletPriceForm.type === "service") {
      return servicesList.find((s) => s.id === outletPriceForm.serviceId)?.price || 0;
    }
    if (outletPriceForm.type === "package") {
      return packagesList.find((p) => p.id === outletPriceForm.packageId)?.price || 0;
    }
    if (outletPriceForm.type === "product") {
      return productMasters.find((p) => p.id === outletPriceForm.productId)?.unitPrice || 0;
    }
    return 0;
  }, [outletPriceForm.type, outletPriceFormItemId, servicesList, packagesList, productMasters]);

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    // Frontend validation
    if (!issueForm.outletId || issueForm.outletId === '') {
      setErrorMessage("Please select an outlet.");
      return;
    }
    if (!issueForm.productId || issueForm.productId === '') {
      setErrorMessage("Please select a product.");
      return;
    }

    try {
      const issuedStock = await issueProductToOutletAPI({
        outletId: issueForm.outletId,
        productId: issueForm.productId,
        qty: Number(issueForm.qty) || 1,
        sellingPrice: issueForm.sellingPrice,
      });
      setIssueForm({
        ...initialIssueForm,
        outletId: isAdmin ? "" : user?.outlet_id || "",
      });
      setIsIssueModalOpen(false);
      setFeedback(
        `${issuedStock.qty} units of ${issuedStock.itemName} issued to ${issuedStock.outletName}.`,
      );
      if (issuedStock.lowStockWarning) {
        const { productName, outletName, currentStock, isOutOfStock } = issuedStock.lowStockWarning;
        const warningMsg = isOutOfStock
          ? `⚠️ ${productName} is now OUT OF STOCK at ${outletName}.`
          : `⚠️ Low stock alert: ${productName} has only ${currentStock} units left at ${outletName}.`;
        setErrorMessage(warningMsg);
      }
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to issue stock to outlet.");
    }
  };

  const openAddOutletPrice = () => {
    setEditingOutletPrice(null);
    setOutletPriceForm(initialOutletPriceForm);
    setIsOutletPriceModalOpen(true);
  };

  const openEditOutletPrice = (record) => {
    setEditingOutletPrice(record);
    setOutletPriceForm({
      type: record.type,
      outletId: record.outletId,
      serviceId: record.serviceId || "",
      packageId: record.packageId || "",
      productId: record.productId || "",
      price: String(record.price),
    });
    setIsOutletPriceModalOpen(true);
  };

  const handleOutletPriceSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    try {
      // Backend currently only supports product prices
      if (outletPriceForm.type !== 'product') {
        setErrorMessage("Service and package outlet prices are not yet supported. Only product prices can be saved.");
        return;
      }
      await saveOutletProductPriceAPI({
        outletId: outletPriceForm.outletId,
        productId: outletPriceForm.productId,
        price: outletPriceForm.price,
      });
      setIsOutletPriceModalOpen(false);
      setOutletPriceForm(initialOutletPriceForm);
      setEditingOutletPrice(null);
      setFeedback("Outlet price saved successfully.");
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save outlet price.");
    }
  };

  const handleDeleteOutletPrice = async (record) => {
    resetMessages();
    try {
      if (record.type !== 'product') {
        setErrorMessage("Service and package outlet prices are not yet supported.");
        return;
      }
      await deleteOutletProductPriceAPI(record.outletId, record.productId, record.type);
      setFeedback("Outlet price removed. Base price will be used.");
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to remove outlet price.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory Flow"
        title="Inventory"
        description="Create the product master, receive stock through purchase orders, and issue stock to outlets for selling or service use."
        action={
          isAdmin ? (
            <button type="button" className="btn-premium-primary" onClick={() => setIsProductModalOpen(true)}>
              Add Product Master
            </button>
          ) : null
        }
      />

      {feedback ? (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-8">
        <div className="space-y-8">
          <section className="table-container">
            <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl text-navy-900">Inventory views</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Switch between the central product catalog and outlet-wise stock.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={
                    activeTab === "product_master" ? "btn-premium-primary" : "btn-premium-outline"
                  }
                  onClick={() => setActiveTab("product_master")}
                >
                  Product Master
                </button>
                <button
                  type="button"
                  className={activeTab === "outlet_stock" ? "btn-premium-primary" : "btn-premium-outline"}
                  onClick={() => setActiveTab("outlet_stock")}
                >
                  Outlet Stock
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className={activeTab === "outlet_prices" ? "btn-premium-primary" : "btn-premium-outline"}
                    onClick={() => setActiveTab("outlet_prices")}
                  >
                    Outlet Prices
                  </button>
                )}
              </div>
            </div>

            {activeTab === "outlet_prices" ? (
              <>
                <div className="px-8 pb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-500">Filter by Outlet:</label>
                    <select
                      className="premium-input !py-2 !text-sm appearance-none min-w-[200px]"
                      value={outletPriceFilter}
                      onChange={(e) => setOutletPriceFilter(e.target.value)}
                    >
                      <option value="">All Outlets</option>
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn-premium-primary !py-2 !text-sm"
                    onClick={openAddOutletPrice}
                  >
                    + Set Outlet Price
                  </button>
                </div>
                {filteredOutletPrices.length === 0 ? (
                  <div className="px-8 pb-8 text-sm text-slate-400 italic">
                    No outlet-specific prices set. Items use their base price everywhere.
                  </div>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Item</th>
                        <th>Outlet</th>
                        <th>Base Price</th>
                        <th>Outlet Price</th>
                        <th>Actions</th>
                        <th>History</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOutletPrices.map((record, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${record.type === "service" ? "bg-navy-50 text-navy-600"
                              : record.type === "package" ? "bg-gold-50 text-gold-700"
                                : "bg-emerald-50 text-emerald-700"
                              }`}>{record.type}</span>
                          </td>
                          <td className="font-bold text-navy-900">{record.itemName}</td>
                          <td>{outletNameById[record.outletId] || record.outletId}</td>
                          <td className="text-slate-400 line-through">{formatCurrency(record.basePrice)}</td>
                          <td className="font-bold text-navy-800">{formatCurrency(record.price)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditOutletPrice(record)}
                                className="flex items-center justify-center rounded-lg border border-navy-200 bg-white p-2 text-navy-700 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                                title="Edit Price"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOutletPrice(record)}
                                className="flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 transition-colors"
                                title="Remove Price"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td>
                            <AuditHistoryButton
                              onClick={() => openAuditHistory('outlet_product_price', `${record.outletId}-${record.productId}`, `${record.itemName} - ${outletNameById[record.outletId]}`)}
                              size="sm"
                              variant="ghost"
                              showText={false}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : activeTab === "product_master" ? (
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Measure</th>
                    <th>Unit Group</th>
                    <th>Unit Price</th>
                    <th>Central Stock</th>
                    <th>Issued to Outlets</th>
                    <th>Network Stock</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {productMasters.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          {Array.isArray(item.images) && item.images.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => openLightbox(item.images, 0)}
                              className="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-navy-100 hover:border-navy-400 transition-colors group"
                              title="View images"
                            >
                              <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                              {item.images.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-navy-800/70 text-white text-[8px] font-bold px-1 leading-4">
                                  +{item.images.length - 1}
                                </span>
                              )}
                            </button>
                          ) : (
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center">
                              <Images size={14} className="text-navy-300" />
                            </div>
                          )}
                          <span className="font-bold text-navy-900">{item.itemName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-bold text-navy-600">
                          {item.productMeasureLabel || "—"}
                        </span>
                      </td>
                      <td>
                        {item.unitMaster ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-[11px] font-semibold text-navy-600">
                            <ArrowLeftRight size={10} />
                            {item.unitMaster.primaryAbbr} ↔ {item.unitMaster.secondaryAbbr}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>
                        {item.centralStock}
                        {item.unitMaster ? (
                          <span className="ml-1 text-xs text-slate-400">{item.unitMaster.primaryAbbr}</span>
                        ) : null}
                      </td>
                      <td>
                        {(() => {
                          console.log(`[UI] Product ${item.id} (${item.itemName}) - issuedStock:`, item.issuedStock);
                          return item.issuedStock;
                        })()}{item.unitMaster ? <span className="ml-1 text-xs text-slate-400">{item.unitMaster.primaryAbbr}</span> : null}
                      </td>
                      <td>{item.totalNetworkStock}{item.unitMaster ? <span className="ml-1 text-xs text-slate-400">{item.unitMaster.primaryAbbr}</span> : null}</td>
                      {isAdmin && (
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIssueForm((current) => ({ 
                                  ...current, 
                                  productId: item.id 
                                }));
                                setIsIssueModalOpen(true);
                              }}
                              className="flex items-center justify-center rounded-lg border border-navy-200 bg-white p-2 text-navy-700 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                              title="Issue to Outlet"
                            >
                              <ArrowLeftRight size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditProduct(item)}
                              className="flex items-center justify-center rounded-lg border border-navy-200 bg-white p-2 text-navy-700 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                              title="Edit Product"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item)}
                              className="flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 size={14} />
                            </button>
                            <AuditHistoryButton
                              onClick={() => openAuditHistory('central_stock', item.id, item.itemName)}
                              size="sm"
                              variant="ghost"
                              showText={false}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <>
                {isAdmin && (
                  <div className="px-8 pb-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-500">Filter by Outlet:</label>
                      <select
                        className="premium-input !py-2 !text-sm appearance-none min-w-[200px]"
                        value={outletFilter}
                        onChange={(e) => setOutletFilter(e.target.value)}
                      >
                        <option value="">All Outlets</option>
                        {outlets.map((outlet) => (
                          <option key={outlet.id} value={outlet.id}>
                            {outlet.name}
                          </option>
                        ))}
                      </select>
                      {outletFilter && (
                        <button
                          type="button"
                          onClick={() => setOutletFilter("")}
                          className="text-xs text-slate-400 hover:text-navy-600 underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      {isAdmin ? <th>Outlet</th> : null}
                      <th>Outlet Stock</th>
                      <th>Unit Price</th>
                      <th>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id}>
                        <td className="font-bold text-navy-900">{item.itemName}</td>
                        {isAdmin ? (
                          <td>{outletNameById[item.outletId] || "Outlet"}</td>
                        ) : null}
                        <td>{item.currentStock}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>
                          <AuditHistoryButton
                            onClick={() => openAuditHistory('outlet_inventory', item.id, item.itemName)}
                            size="sm"
                            variant="ghost"
                            showText={false}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        </div>

      </div>


      {isEditProductModalOpen && editingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl text-navy-900">Edit product</h2>
                <p className="mt-1 text-sm text-slate-500">{editingProduct.itemName}</p>
              </div>
              <button type="button" className="btn-premium-outline !p-2 rounded-full" onClick={() => setIsEditProductModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleEditProductSubmit}>
              <div>
                <label className="premium-label">Item Name</label>
                <input
                  className="premium-input"
                  value={editProductForm.itemName}
                  onChange={(e) => setEditProductForm((c) => ({ ...c, itemName: e.target.value }))}
                />
              </div>
              <div>
                <label className="premium-label">Unit Price (RM)</label>
                <input
                  type="number"
                  min="0"
                  className="premium-input"
                  value={editProductForm.unitPrice}
                  onChange={(e) => setEditProductForm((c) => ({ ...c, unitPrice: e.target.value }))}
                />
              </div>
              <div>
                <label className="premium-label">Unit Master</label>
                <select
                  className="premium-input appearance-none"
                  value={editProductForm.unitMasterId ?? ""}
                  onChange={(e) => setEditProductForm((c) => ({ ...c, unitMasterId: e.target.value }))}
                >
                  <option value="">Select Unit Group</option>
                  {unitMasterList.map((um) => (
                    <option key={um.id} value={um.id}>{um.groupName}</option>
                  ))}
                </select>
              </div>
              <ImageUpload
                label="Product Images"
                value={editProductForm.images}
                onChange={(images) => setEditProductForm((c) => ({ ...c, images }))}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
                multiple={true}
                maxImages={5}
              />
              <button type="submit" className="btn-premium-primary w-full">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isProductModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-3xl text-navy-900">Create product master</h2>
              </div>
              <button type="button" className="btn-premium-outline !p-2 rounded-full flex-shrink-0" onClick={() => setIsProductModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 mt-4 custom-scrollbar">
              <form className="space-y-4 pb-2" onSubmit={handleProductSubmit}>
                <div>
                  <label className="premium-label">Item Name</label>
                  <input
                    className="premium-input"
                    value={productForm.itemName}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, itemName: event.target.value }))
                    }
                    placeholder="Retail or service consumption SKU"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="premium-label">Unit Price (RM)</label>
                    <input
                      type="number"
                      min="0"
                      className="premium-input"
                      value={productForm.unitPrice}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          unitPrice: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="premium-label">Opening Stock</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="premium-input"
                      placeholder="Initial qty"
                      value={productForm.openingStock}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          openingStock: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Unit Master Selection */}
                <div>
                  <label className="premium-label">Unit Master</label>
                  <select
                    className="premium-input appearance-none"
                    value={productForm.unitMasterId}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        unitMasterId: event.target.value,
                        purchaseUnit: "primary",
                        consumptionUnit: "primary",
                      }))
                    }
                  >
                    <option value="">Select Unit Group</option>
                    {unitMasterList.map((um) => (
                      <option key={um.id} value={um.id}>
                        {um.groupName}
                      </option>
                    ))}
                  </select>
                </div>

                {
                  selectedProductUnitMaster ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="premium-label">Product Measure (Capacity)</label>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            className="premium-input"
                            value={productForm.productMeasure}
                            onChange={(e) =>
                              setProductForm((current) => ({ ...current, productMeasure: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label className="premium-label">Measure Unit</label>
                          <select
                            className="premium-input appearance-none"
                            value={productForm.productMeasureUnit}
                            onChange={(e) =>
                              setProductForm((current) => ({ ...current, productMeasureUnit: e.target.value }))
                            }
                          >
                            {getAvailableUnits(selectedProductUnitMaster).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="premium-label">Purchase Unit</label>
                          <select
                            className="premium-input appearance-none"
                            value={productForm.purchaseUnit}
                            onChange={(e) =>
                              setProductForm((current) => ({ ...current, purchaseUnit: e.target.value }))
                            }
                          >
                            {getAvailableUnits(selectedProductUnitMaster).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="premium-label">Consumption Unit</label>
                          <select
                            className="premium-input appearance-none"
                            value={productForm.consumptionUnit}
                            onChange={(e) =>
                              setProductForm((current) => ({ ...current, consumptionUnit: e.target.value }))
                            }
                          >
                            {getAvailableUnits(selectedProductUnitMaster).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl bg-navy-50/50 p-3 text-xs font-semibold text-navy-600">
                        <ArrowLeftRight size={12} />
                        <span>
                          1 {selectedProductUnitMaster.primaryAbbr} = {selectedProductUnitMaster.conversionRatio} {selectedProductUnitMaster.secondaryAbbr}
                        </span>
                      </div>
                    </>
                  ) : null
                }

                <ImageUpload
                  label="Product Images"
                  value={productForm.images}
                  onChange={(images) =>
                    setProductForm((current) => ({ ...current, images }))
                  }
                  accept="image/*"
                  maxSize={5 * 1024 * 1024}
                  multiple={true}
                  maxImages={5}
                />
                <button type="submit" className="btn-premium-primary w-full">
                  Save Product Master
                </button>
              </form >
            </div>
          </div >
        </div >
      ) : null
      }

      {
        isPoModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
            <div className="card-solid w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-3xl text-navy-900">Create purchase order</h2>
                </div>
                <button type="button" className="btn-premium-outline !p-2 rounded-full flex-shrink-0" onClick={() => setIsPoModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 mt-4 custom-scrollbar">
                <form className="space-y-4 pb-2" onSubmit={handlePoSubmit}>
                  <div>
                    <label className="premium-label">Supplier Name</label>
                    <input
                      name="supplierName"
                      className="premium-input"
                      value={poForm.supplierName}
                      onChange={handlePoChange}
                      placeholder="Supplier or brand partner"
                    />
                  </div>
                  <div>
                    <label className="premium-label">Select Product Master</label>
                    <select
                      name="productId"
                      className="premium-input appearance-none"
                      value={poForm.productId}
                      onChange={(e) => {
                        handlePoChange(e);
                        // Reset unit to product's default purchase unit
                        const prod = productMasters.find((p) => p.id === e.target.value);
                        setPoForm((current) => ({ ...current, unit: prod?.purchaseUnit || "primary" }));
                      }}
                    >
                      <option value="">Choose a product</option>
                      {productMasters.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="premium-label">Qty</label>
                      <input
                        name="qty"
                        type="number"
                        min="0.001"
                        step="any"
                        className="premium-input"
                        value={poForm.qty}
                        onChange={handlePoChange}
                      />
                    </div>
                    <div>
                      <label className="premium-label">Unit</label>
                      <select
                        name="unit"
                        className="premium-input appearance-none"
                        value={poForm.unit}
                        onChange={(e) => setPoForm((current) => ({ ...current, unit: e.target.value }))}
                      >
                        {selectedPoUnitMaster
                          ? getAvailableUnits(selectedPoUnitMaster).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))
                          : <option value="primary">Unit</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label className="premium-label">Total Cost</label>
                      <input
                        name="totalCost"
                        type="number"
                        className="premium-input"
                        value={poForm.totalCost}
                        onChange={handlePoChange}
                      />
                    </div>
                  </div>
                  {selectedPoProduct && selectedPoUnitMaster ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-2xl bg-navy-50/50 p-4 text-xs font-semibold text-navy-600">
                        <span className="h-2 w-2 rounded-full bg-navy-400"></span>
                        Current central stock: {selectedPoProduct.centralStock} {selectedPoUnitMaster.primaryAbbr}
                      </div>
                      {poForm.unit === "secondary" && poForm.qty ? (
                        <div className="flex items-center gap-2 rounded-2xl bg-gold-50/50 p-3 text-xs font-semibold text-gold-700">
                          <ArrowLeftRight size={12} />
                          {poForm.qty} {selectedPoUnitMaster.secondaryAbbr} = {convertToBase(poForm.qty, selectedPoUnitMaster.conversionRatio, "secondary").toFixed(4).replace(/\.?0+$/, "")} {selectedPoUnitMaster.primaryAbbr} (base unit)
                        </div>
                      ) : null}
                    </div>
                  ) : selectedPoProduct ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-navy-50/50 p-4 text-xs font-semibold text-navy-600">
                      <span className="h-2 w-2 rounded-full bg-navy-400"></span>
                      Current central stock: {selectedPoProduct.centralStock}
                    </div>
                  ) : null}
                  <button type="submit" className="btn-premium-primary w-full">
                    Record PO
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null
      }

      {
        isIssueModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
            <div className="card-solid w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-3xl text-navy-900">Issue product to outlet</h2>
                </div>
                <button type="button" className="btn-premium-outline !p-2 rounded-full flex-shrink-0" onClick={() => setIsIssueModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 pr-1 mt-4 custom-scrollbar">
                <form className="space-y-4 pb-2" onSubmit={handleIssueSubmit}>
                  <div>
                    <label className="premium-label">Product Master</label>
                    {issueForm.productId && productMasters.find((p) => p.id === issueForm.productId) ? (
                      <div className="premium-input flex items-center gap-2 bg-navy-50/60 text-navy-800 font-semibold">
                        <ArrowLeftRight size={14} className="text-navy-400" />
                        {productMasters.find((p) => p.id === issueForm.productId)?.itemName}
                      </div>
                    ) : (
                      <select
                        className="premium-input appearance-none"
                        value={issueForm.productId}
                        onChange={(event) =>
                          setIssueForm((current) => ({ ...current, productId: event.target.value }))
                        }
                      >
                        <option value="">Choose a product</option>
                        {productMasters.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.itemName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="premium-label">Target Outlet</label>
                      <select
                        className="premium-input appearance-none"
                        value={issueForm.outletId}
                        onChange={(event) =>
                          setIssueForm((current) => ({ ...current, outletId: event.target.value }))
                        }
                        disabled={outlets.length === 0}
                      >
                        <option value="">{outlets.length === 0 ? 'No outlets available' : 'Select outlet'}</option>
                        {outlets.map((outlet) => (
                          <option key={outlet.id} value={outlet.id}>
                            {outlet.name}
                          </option>
                        ))}
                      </select>
                      {outlets.length === 0 && (
                        <p className="mt-1.5 text-xs text-red-500">No outlets found. Please create outlets first.</p>
                      )}
                    </div>
                    <div>
                      <label className="premium-label">Qty to Issue</label>
                      <input
                        type="number"
                        min="1"
                        className="premium-input"
                        value={issueForm.qty}
                        onChange={(event) =>
                          setIssueForm((current) => ({ ...current, qty: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="premium-label">Outlet Selling Price (optional)</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="premium-input !pl-9"
                        placeholder={selectedIssueProduct ? `Base: ${formatCurrency(selectedIssueProduct.unitPrice)}` : "Leave blank to use base price"}
                        value={issueForm.sellingPrice}
                        onChange={(event) =>
                          setIssueForm((current) => ({ ...current, sellingPrice: event.target.value }))
                        }
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">Set a custom price for this product at the selected outlet. Leave blank to use the default unit price.</p>
                  </div>
                  {selectedIssueProduct ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-gold-50/50 p-4 text-xs font-semibold text-gold-700">
                      <span className="h-2 w-2 rounded-full bg-gold-400"></span>
                      Available central stock: {selectedIssueProduct.centralStock}
                    </div>
                  ) : null}
                  <button type="submit" className="btn-premium-primary w-full shadow-gold-500/20">
                    Confirm Issue
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null
      }

      {
        isOutletPriceModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
            <div className="card-solid w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-3xl text-navy-900 font-bold">
                    {editingOutletPrice ? "Edit outlet price" : "Set outlet price"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">Override the default price for a service, package, or product at a specific outlet.</p>
                </div>
                <button type="button" className="btn-premium-outline !p-2 rounded-full flex-shrink-0" onClick={() => setIsOutletPriceModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 mt-4 custom-scrollbar">
                <form className="space-y-4 pb-2" onSubmit={handleOutletPriceSubmit}>
                  <div>
                    <label className="premium-label">Item Type</label>
                    <div className="flex gap-2">
                      {["service", "package", "product"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          disabled={Boolean(editingOutletPrice)}
                          onClick={() => setOutletPriceForm((f) => ({ ...f, type: t, serviceId: "", packageId: "", productId: "" }))}
                          className={`flex-1 rounded-xl border py-2 text-xs font-black uppercase tracking-widest transition ${outletPriceForm.type === t
                            ? "bg-navy-900 text-white border-navy-900"
                            : "bg-white text-navy-600 border-navy-200 hover:bg-navy-50"
                            } disabled:opacity-50`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="premium-label">Outlet</label>
                    <select
                      required
                      disabled={Boolean(editingOutletPrice)}
                      className="premium-input appearance-none disabled:opacity-60"
                      value={outletPriceForm.outletId}
                      onChange={(e) => setOutletPriceForm((f) => ({ ...f, outletId: e.target.value }))}
                    >
                      <option value="">Select outlet</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  {outletPriceForm.type === "service" && (
                    <div>
                      <label className="premium-label">Service</label>
                      <select
                        required
                        disabled={Boolean(editingOutletPrice)}
                        className="premium-input appearance-none disabled:opacity-60"
                        value={outletPriceForm.serviceId}
                        onChange={(e) => setOutletPriceForm((f) => ({ ...f, serviceId: e.target.value }))}
                      >
                        <option value="">Choose a service</option>
                        {servicesList.map((s) => (
                          <option key={s.id} value={s.id}>{s.serviceName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {outletPriceForm.type === "package" && (
                    <div>
                      <label className="premium-label">Package</label>
                      <select
                        required
                        disabled={Boolean(editingOutletPrice)}
                        className="premium-input appearance-none disabled:opacity-60"
                        value={outletPriceForm.packageId}
                        onChange={(e) => setOutletPriceForm((f) => ({ ...f, packageId: e.target.value }))}
                      >
                        <option value="">Choose a package</option>
                        {packagesList.map((p) => (
                          <option key={p.id} value={p.id}>{p.packageName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {outletPriceForm.type === "product" && (
                    <div>
                      <label className="premium-label">Product</label>
                      <select
                        required
                        disabled={Boolean(editingOutletPrice)}
                        className="premium-input appearance-none disabled:opacity-60"
                        value={outletPriceForm.productId}
                        onChange={(e) => setOutletPriceForm((f) => ({ ...f, productId: e.target.value }))}
                      >
                        <option value="">Choose a product</option>
                        {productMasters.map((p) => (
                          <option key={p.id} value={p.id}>{p.itemName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="premium-label">Outlet Price</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        className="premium-input !pl-9"
                        placeholder="Enter outlet-specific price"
                        value={outletPriceForm.price}
                        onChange={(e) => setOutletPriceForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    {outletPriceFormBasePrice > 0 && (
                      <p className="mt-1.5 text-xs text-slate-400">
                        Base price: <span className="font-semibold text-slate-600">{formatCurrency(outletPriceFormBasePrice)}</span>
                      </p>
                    )}
                  </div>

                  <button type="submit" className="btn-premium-primary w-full">
                    Save Outlet Price
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null
      }

      {isLightboxOpen && lightboxImages.length > 0 ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative flex flex-col items-center gap-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-2 -right-2 z-10 p-1.5 bg-white rounded-full shadow hover:bg-gray-100"
            >
              <X size={16} />
            </button>

            <div className="relative flex items-center gap-3">
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)}
                  className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`Image ${lightboxIndex + 1}`}
                className="max-h-[75vh] max-w-[80vw] rounded-xl object-contain shadow-2xl"
              />
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i + 1) % lightboxImages.length)}
                  className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {lightboxImages.length > 1 && (
              <div className="flex gap-2">
                {lightboxImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === lightboxIndex ? 'border-white' : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <p className="text-white/60 text-xs">
              {lightboxIndex + 1} / {lightboxImages.length}
            </p>
          </div>
        </div>
      ) : null}

      {/* Audit History Modal */}
      <AuditHistoryModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        entityType={auditEntity.type}
        entityId={auditEntity.id}
        entityName={auditEntity.name}
      />

    </div >
  );
}
