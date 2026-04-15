import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  createProduct,
  createPurchaseOrder,
  fetchInventory,
  fetchOutlets,
  fetchProductMasters,
  issueProductToOutlet,
} from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";

const initialProductForm = {
  itemName: "",
  unitPrice: "",
};

const initialPoForm = {
  supplierName: "",
  productId: "",
  qty: 1,
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
  const [productMasters, setProductMasters] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [outlets, setOutlets] = useState([]);
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
    const [productList, inventoryItems, outletList] = await Promise.all([
      fetchProductMasters(),
      fetchInventory({ outletId: isAdmin ? undefined : user?.outlet_id }),
      fetchOutlets(),
    ]);

    setProductMasters(productList);
    setInventory(inventoryItems);
    setOutlets(outletList);
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
      await createProduct(productForm);
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
      await createPurchaseOrder(poForm);
      setPoForm(initialPoForm);
      setIsPoModalOpen(false);
      setFeedback("Purchase order recorded and stock moved into central inventory.");
      await loadInventoryPage();
    } catch (error) {
      setErrorMessage(error.message || "Unable to create purchase order.");
    }
  };

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
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{item.centralStock}</td>
                      <td>{item.issuedStock}</td>
                      <td>{item.totalNetworkStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
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
                  {inventory.map((item) => (
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
          <div className="glass-card w-full max-w-lg">
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
                <label className="premium-label">Unit Price ($)</label>
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
              <button type="submit" className="btn-premium-primary w-full">
                Save Product Master
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isPoModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg">
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
                  onChange={handlePoChange}
                >
                  <option value="">Choose a product</option>
                  {productMasters.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="premium-label">Qty</label>
                  <input
                    name="qty"
                    type="number"
                    min="1"
                    className="premium-input"
                    value={poForm.qty}
                    onChange={handlePoChange}
                  />
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
              {selectedPoProduct ? (
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
          <div className="glass-card w-full max-w-lg">
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
