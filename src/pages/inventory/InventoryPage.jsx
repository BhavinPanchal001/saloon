import { useEffect, useMemo, useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  createProduct,
  createPurchaseOrder,
  fetchInventory,
  fetchOutlets,
  fetchProductMasters,
  fetchUnitMasters,
  issueProductToOutlet,
} from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";
import { getAvailableUnits, getUnitAbbr, convertToBase, convertFromBase } from "../../utils/unitConversion";

const initialProductForm = {
  itemName: "",
  unitPrice: "",
  unitMasterId: "",
  purchaseUnit: "primary",
  consumptionUnit: "primary",
  productMeasure: 1,
  productMeasureUnit: "primary",
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
};

export function InventoryPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const scopedOutletId = isAdmin ? "" : user?.outlet_id || "";

  const [activeTab, setActiveTab] = useState("product_master");
  const [outletFilter, setOutletFilter] = useState("");
  const [productMasters, setProductMasters] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [unitMasterList, setUnitMasterList] = useState([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [poForm, setPoForm] = useState(initialPoForm);
  const [issueForm, setIssueForm] = useState({
    ...initialIssueForm,
    outletId: scopedOutletId,
  });
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadInventoryPage = async () => {
    const [productList, inventoryItems, outletList, unitList] = await Promise.all([
      fetchProductMasters(),
      fetchInventory({ outletId: isAdmin ? undefined : user?.outlet_id }),
      fetchOutlets(),
      fetchUnitMasters(),
    ]);

    setProductMasters(productList);
    setInventory(inventoryItems);
    setOutlets(outletList);
    setUnitMasterList(unitList.filter((u) => u.status === "active"));
  };

  useEffect(() => {
    if (user) {
      loadInventoryPage();
      setIssueForm((current) => ({
        ...current,
        outletId: isAdmin ? "" : user?.outlet_id || "",
      }));
    }
  }, [isAdmin, user]);

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
      await createProduct({
        ...productForm,
        unitMasterId: productForm.unitMasterId || "unit_piece",
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
      await createPurchaseOrder({
        ...poForm,
        unit: poForm.unit || "primary",
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
    return inventory.filter((item) => item.outletId === outletFilter);
  }, [inventory, outletFilter]);

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    try {
      const issuedStock = await issueProductToOutlet(issueForm);
      setIssueForm({
        ...initialIssueForm,
        outletId: isAdmin ? "" : user?.outlet_id || "",
      });
      setIsIssueModalOpen(false);
      setFeedback(
        `${issuedStock.qty} units of ${issuedStock.itemName} issued to ${issuedStock.outletName}.`,
      );
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to issue stock to outlet.");
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

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
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
              </div>
            </div>

            {activeTab === "product_master" ? (
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
                  </tr>
                </thead>
                <tbody>
                  {productMasters.map((item) => (
                    <tr key={item.id}>
                      <td className="font-bold text-navy-900">{item.itemName}</td>
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
                      <td>{item.issuedStock}{item.unitMaster ? <span className="ml-1 text-xs text-slate-400">{item.unitMaster.primaryAbbr}</span> : null}</td>
                      <td>{item.totalNetworkStock}{item.unitMaster ? <span className="ml-1 text-xs text-slate-400">{item.unitMaster.primaryAbbr}</span> : null}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {isAdmin ? (
            <section className="glass-card">
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-3xl text-navy-900">Stock movement</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Manage central receipts and outlet transfers from one place.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-premium-primary flex-1"
                    onClick={() => setIsPoModalOpen(true)}
                  >
                    Create PO
                  </button>
                  <button
                    type="button"
                    className="btn-premium-outline flex-1"
                    onClick={() => setIsIssueModalOpen(true)}
                  >
                    Issue Product
                  </button>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-gold-200 bg-gold-50/50 p-6">
                <p className="text-xs font-black uppercase tracking-widest text-gold-700">Quick reminder</p>
                <p className="mt-3 text-sm leading-relaxed text-gold-900">
                  Purchase orders add stock into the central pool. Issue product moves that stock to a specific outlet.
                </p>
              </div>
            </section>
          ) : (
            <section className="glass-card">
              <p className="premium-label">Inventory Access</p>
              <h2 className="mt-3 text-3xl text-navy-900">Outlet stock only</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Product master creation, purchase orders, and outlet issue are handled from the admin login. This screen stays focused on the stock already assigned to your outlet.
              </p>
            </section>
          )}
        </div>
      </div>


      {isProductModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl text-navy-900">Create product master</h2>
              </div>
              <button type="button" className="btn-premium-outline !p-2 rounded-full" onClick={() => setIsProductModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleProductSubmit}>
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

              {selectedProductUnitMaster ? (
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
              ) : null}

              <button type="submit" className="btn-premium-primary w-full">
                Save Product Master
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isPoModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl text-navy-900">Create purchase order</h2>
              </div>
              <button type="button" className="btn-premium-outline !p-2 rounded-full" onClick={() => setIsPoModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handlePoSubmit}>
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
      ) : null}

      {isIssueModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl text-navy-900">Issue product to outlet</h2>
              </div>
              <button type="button" className="btn-premium-outline !p-2 rounded-full" onClick={() => setIsIssueModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleIssueSubmit}>
              <div>
                <label className="premium-label">Product Master</label>
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
              </div>
              <div>
                <label className="premium-label">Target Outlet</label>
                <select
                  className="premium-input appearance-none"
                  value={issueForm.outletId}
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, outletId: event.target.value }))
                  }
                >
                  <option value="">Select outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
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
      ) : null}

    </div>
  );
}
