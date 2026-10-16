import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import {
  fetchServiceByIdFromAPI,
  createServiceAPI,
  updateServiceAPI,
  fetchServiceCategoriesFromAPI,
  fetchProductsFromAPI,
  fetchOutletsFromAPI,
  fetchOutletInventoryFromAPI,
} from '../../../services/api';
import { getAvailableUnits, getUnitAbbr, convertToBase } from '../../../utils/unitConversion';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { useAuthStore } from '../../../stores/authStore';
import '../styles/services.css';

interface ProductLinkage {
  inventoryId: string;
  quantityUsed: number;
  consumptionUnit?: string;
}

interface ServiceForm {
  serviceName: string;
  category: string;
  price: string;
  duration: string;
  images: string[];
  productLinkages: ProductLinkage[];
  assignedOutletIds: number[];
}

const createInitialLinkage = (): ProductLinkage => ({
  inventoryId: "",
  quantityUsed: 1,
  consumptionUnit: "primary",
});

const createInitialServiceForm = (defaultOutletId?: number): ServiceForm => ({
  serviceName: "",
  category: "",
  price: "",
  duration: "",
  images: [],
  productLinkages: [createInitialLinkage()],
  assignedOutletIds: defaultOutletId ? [defaultOutletId] : [],
});

const ServiceFormPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const defaultOutletId = !isAdmin && user?.outlet_id ? Number(user.outlet_id) : undefined;
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [outletProductsLoading, setOutletProductsLoading] = useState(false);
  const [form, setForm] = useState<ServiceForm>(() => createInitialServiceForm(defaultOutletId));

  useEffect(() => {
    const loadData = async () => {
      const [inventoryList, categoryList, outletList] = await Promise.all([
        fetchProductsFromAPI(),
        fetchServiceCategoriesFromAPI(),
        fetchOutletsFromAPI(),
      ]);
      setAllProducts(inventoryList);
      setCategories(categoryList);
      setOutlets(outletList);

      const targetId = id || duplicateId;
      if (targetId) {
        const service = await fetchServiceByIdFromAPI(targetId);
        setForm({
          serviceName: duplicateId ? `${service.service_name || ''} (Copy)` : (service.service_name || ''),
          category: service.category_id ? String(service.category_id) : (categoryList[0]?.id ? String(categoryList[0].id) : ''),
          price: String(service.price || ''),
          duration: String(service.duration || ''),
          images: service.images || [],
          productLinkages: (service.product_linkages || []).length > 0
            ? service.product_linkages.map((l: any) => ({
                inventoryId: String(l.inventoryId || l.inventory_id || ''),
                quantityUsed: l.quantityUsed ?? l.quantity_used ?? 1,
                consumptionUnit: l.consumptionUnit || l.consumption_unit || 'primary',
              }))
            : [createInitialLinkage()],
          assignedOutletIds: service.assigned_outlet_ids || [],
        });
      } else {
        setForm((prev) => ({
          ...prev,
          category: prev.category || (categoryList[0]?.id ? String(categoryList[0].id) : ''),
          assignedOutletIds: prev.assignedOutletIds.length > 0 ? prev.assignedOutletIds : (defaultOutletId ? [defaultOutletId] : []),
        }));
      }
    };
    loadData();
  }, [id, duplicateId, defaultOutletId]);

  // Only outlets that are selected for this service
  const selectedOutlets = outlets.filter((o: any) => form.assignedOutletIds.includes(o.id));

  // Automatically fetch products for selected outlets
  useEffect(() => {
    if (form.assignedOutletIds.length === 0) {
      setInventory([]);
      setSelectedOutlet('');
      setOutletProductsLoading(false);
      return;
    }

    // Reset selectedOutlet filter if it's no longer one of the assigned outlets
    if (selectedOutlet && !form.assignedOutletIds.includes(Number(selectedOutlet))) {
      setSelectedOutlet('');
      return;
    }

    let isMounted = true;
    const fetchSelectedOutletProducts = async () => {
      setOutletProductsLoading(true);
      try {
        let outletItems: any[] = [];
        if (selectedOutlet) {
          outletItems = await fetchOutletInventoryFromAPI({ outletId: selectedOutlet });
        } else if (form.assignedOutletIds.length === 1) {
          outletItems = await fetchOutletInventoryFromAPI({ outletId: String(form.assignedOutletIds[0]) });
        } else {
          // Fetch for all assigned outlets using comma-separated IDs
          const res = await fetchOutletInventoryFromAPI({ outletId: form.assignedOutletIds.join(',') });
          outletItems = res;
        }

        if (!isMounted) return;

        // Map and deduplicate by productId
        const productMap = new Map<string, any>();
        for (const item of outletItems) {
          const prodId = String(item.productId);
          if (!productMap.has(prodId)) {
            productMap.set(prodId, {
              id: prodId,
              itemName: item.itemName,
              unitPrice: item.unitPrice,
              unitMasterId: item.unitMasterId,
              currentStock: item.currentStock,
              unitMaster: item.unitMaster,
              consumptionUnit: item.consumptionUnit,
            });
          }
        }
        setInventory(Array.from(productMap.values()));
      } catch (err) {
        console.error('Error fetching outlet inventory:', err);
        if (isMounted) setInventory([]);
      } finally {
        if (isMounted) setOutletProductsLoading(false);
      }
    };

    fetchSelectedOutletProducts();

    return () => {
      isMounted = false;
    };
  }, [form.assignedOutletIds, selectedOutlet]);

  const toggleOutlet = (outletId: number) => {
    setForm((current) => ({
      ...current,
      assignedOutletIds: current.assignedOutletIds.includes(outletId)
        ? current.assignedOutletIds.filter((id) => id !== outletId)
        : [...current.assignedOutletIds, outletId],
    }));
  };

  const updateLinkage = (index: number, key: string, value: any) => {
    setForm((current) => ({
      ...current,
      productLinkages: current.productLinkages.map((linkage, linkageIndex) =>
        linkageIndex === index ? { ...linkage, [key]: value } : linkage,
      ),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const cleanedLinkages = form.productLinkages.filter((linkage) => linkage.inventoryId);
      const payload = {
        service_name: form.serviceName,
        category_id: form.category ? Number(form.category) : null,
        price: Number(form.price),
        duration: Number(form.duration),
        product_linkages: cleanedLinkages.map((l) => ({
          inventoryId: l.inventoryId,
          quantityUsed: Number(l.quantityUsed),
          consumptionUnit: l.consumptionUnit || 'primary',
        })),
        images: form.images,
        assigned_outlet_ids: form.assignedOutletIds,
      };
      if (id) {
        await updateServiceAPI(id, payload);
      } else {
        await createServiceAPI(payload);
      }
      navigate('/services');
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="services-module">
      <header className="module-header">
        <div className="module-title">
          <button
            onClick={() => navigate('/services')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--svc-primary)',
              cursor: 'pointer',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: 0
            }}
          >
            ← Back to Services
          </button>
          <h1>{id ? 'Edit Service' : duplicateId ? 'Duplicate Service' : 'Add New Service'}</h1>
          <p>Define the service details and consumption requirements.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div className="glass-card">
              <h2 className="form-section-title">General Information</h2>
              <div className="form-grid">
                <div className="form-field">
                  <label>Service Name</label>
                  <input
                    className="premium-input"
                    value={form.serviceName}
                    onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                    placeholder="e.g. Hair Cut, Facial, etc."
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Category</label>
                  <select
                    className="premium-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="form-field">
                    <label>Price (RM)</label>
                    <input
                      type="number"
                      className="premium-input"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Duration (min)</label>
                    <input
                      type="number"
                      className="premium-input"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload & Outlet Selection Row */}
              <div className="grid gap-6 md:grid-cols-2" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--svc-border)' }}>
                <ImageUpload
                  label="Service Images"
                  value={form.images}
                  onChange={(images: string[]) => setForm({ ...form, images })}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024}
                  multiple={true}
                  maxImages={5}
                />

                {isAdmin && (
                  <div className="form-field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Store size={18} className="text-navy-600" />
                        <label style={{ fontWeight: 600, color: 'var(--svc-text-main)', fontSize: '0.875rem' }}>Select Outlets</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-navy-600 hover:text-navy-800 font-medium cursor-pointer bg-transparent border-0 p-0"
                          onClick={() => setForm((current) => ({ ...current, assignedOutletIds: outlets.map((o) => o.id) }))}
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer bg-transparent border-0 p-0"
                          onClick={() => setForm((current) => ({ ...current, assignedOutletIds: [] }))}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      Select outlets where this service will be available.
                    </p>
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                      {outlets.map((outlet) => {
                        const isSelected = form.assignedOutletIds.includes(outlet.id);
                        return (
                          <label
                            key={outlet.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-navy-600 bg-navy-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            style={{ minHeight: '44px' }}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-600"
                              checked={isSelected}
                              onChange={() => toggleOutlet(outlet.id)}
                            />
                            <div className="flex flex-col" style={{ lineHeight: '1.2' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? 'var(--svc-text-main)' : '#475569' }}>
                                {outlet.name}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                                {outlet.city}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="form-section-title" style={{ margin: 0 }}>Product Consumption</h2>
                <button
                  type="button"
                  className="btn-premium-outline !py-2 !px-4 text-xs"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      productLinkages: [...current.productLinkages, createInitialLinkage()],
                    }))
                  }
                >
                  + Add Linkage
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Specify the inventory items and quantities used during this service.
              </p>

              {/* Outlet Scoped Products Information / Filter */}
              {selectedOutlets.length === 0 ? (
                <div className="p-3.5 mb-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-800 text-xs flex items-center gap-2.5">
                  <Store size={16} className="text-amber-600 shrink-0" />
                  <span>Please select outlet(s) under <strong>Select Outlets</strong> above to view and link products for consumption.</span>
                </div>
              ) : selectedOutlets.length === 1 ? (
                <div className="flex items-center justify-between p-3 mb-4 rounded-xl border border-slate-200 bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-navy-600" />
                    <span className="text-xs text-slate-600">Products for selected outlet:</span>
                    <span className="text-xs font-semibold text-navy-800 bg-navy-50 px-2 py-0.5 rounded border border-navy-200">
                      {selectedOutlets[0].name}
                    </span>
                  </div>
                  {outletProductsLoading && (
                    <span className="text-xs text-slate-500 animate-pulse">Loading products...</span>
                  )}
                </div>
              ) : (
                <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Filter Products by Selected Outlet
                    </label>
                    {outletProductsLoading && (
                      <span className="text-xs text-slate-500 animate-pulse">Loading products...</span>
                    )}
                  </div>
                  <select
                    className="premium-input"
                    value={selectedOutlet}
                    onChange={(e) => setSelectedOutlet(e.target.value)}
                  >
                    <option value="">All Selected Outlets ({selectedOutlets.length})</option>
                    {selectedOutlets.map((o: any) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {!outletProductsLoading && selectedOutlets.length > 0 && inventory.length === 0 && (
                <div className="p-3 mb-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs">
                  No products found in inventory for the selected outlet(s).
                </div>
              )}

              <div className="space-y-4">
                {form.productLinkages.map((linkage, index) => {
                  const selectedProduct = allProducts.find((p: any) => String(p.id) === String(linkage.inventoryId));
                  const unitMaster = selectedProduct?.unitMaster || null;
                  const unitOptions = unitMaster ? getAvailableUnits(unitMaster) : [];
                  const currentAbbr = unitMaster
                    ? getUnitAbbr(unitMaster, (linkage.consumptionUnit || 'primary') as 'primary' | 'secondary')
                    : '';
                  const baseAbbr = unitMaster ? unitMaster.primaryAbbr : '';
                  const showConversion = unitMaster && linkage.consumptionUnit === 'secondary' && linkage.quantityUsed;
                  const baseEquiv = showConversion
                    ? convertToBase(linkage.quantityUsed, unitMaster.conversionRatio, 'secondary')
                    : null;

                  return (
                    <div key={index} className="linkage-row service-product-row">
                      <div className="form-field">
                        <label>Product</label>
                        <select
                          className="premium-input"
                          value={linkage.inventoryId}
                          disabled={selectedOutlets.length === 0 || outletProductsLoading}
                          onChange={(e) => {
                            updateLinkage(index, "inventoryId", e.target.value);
                            // Reset unit to product's default consumption unit
                            const prod = allProducts.find((p: any) => String(p.id) === String(e.target.value));
                            if (prod) {
                              updateLinkage(index, "consumptionUnit", prod.consumptionUnit || "primary");
                            }
                          }}
                        >
                          <option value="">
                            {selectedOutlets.length === 0
                              ? "Select outlet(s) above first"
                              : outletProductsLoading
                              ? "Loading products..."
                              : inventory.length === 0
                              ? "No products available"
                              : "Select Item"}
                          </option>
                          {inventory.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.itemName} {item.isStockable === false || item.is_stockable === false ? ' (Non-Stockable)' : ''}
                            </option>
                          ))}
                          {linkage.inventoryId && !inventory.some((item: any) => String(item.id) === String(linkage.inventoryId)) && (
                            (() => {
                              const existingProd = allProducts.find((p: any) => String(p.id) === String(linkage.inventoryId));
                              return existingProd ? (
                                <option key={existingProd.id} value={existingProd.id}>
                                  {existingProd.itemName} (Previously linked){existingProd.isStockable === false || existingProd.is_stockable === false ? ' (Non-Stockable)' : ''}
                                </option>
                              ) : null;
                            })()
                          )}
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Quantity</label>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          className="premium-input"
                          value={linkage.quantityUsed}
                          onChange={(e) => updateLinkage(index, "quantityUsed", e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Unit</label>
                        <select
                          className="premium-input"
                          value={linkage.consumptionUnit || 'primary'}
                          onChange={(e) => updateLinkage(index, "consumptionUnit", e.target.value)}
                        >
                          {unitOptions.length > 0
                            ? unitOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))
                            : <option value="primary">Unit</option>
                          }
                        </select>
                      </div>
                      <button
                        type="button"
                        style={{
                          height: '42px',
                          width: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            productLinkages:
                              current.productLinkages.length === 1
                                ? [createInitialLinkage()]
                                : current.productLinkages.filter((_, linkageIndex) => linkageIndex !== index),
                          }))
                        }
                      >
                        ×
                      </button>
                      {selectedProduct && (selectedProduct.isStockable === false || selectedProduct.is_stockable === false) ? (
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#b45309', padding: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>⚠️ Non-stockable: Usage qty recorded for recipe, but inventory stock will <strong>not</strong> be deducted on checkout.</span>
                        </div>
                      ) : showConversion && baseEquiv !== null ? (
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#16a34a', padding: '0.25rem 0 0' }}>
                          ✓ Stockable: {baseEquiv.toFixed(4).replace(/\.?0+$/, '')} {baseAbbr} (base unit) will be deducted on checkout.
                        </div>
                      ) : selectedProduct ? (
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#16a34a', padding: '0.25rem 0 0' }}>
                          ✓ Stockable: Will deduct {linkage.quantityUsed || 1} {currentAbbr || 'units'} from outlet stock on checkout.
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card">
              <h2 className="form-section-title">Publishing</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Ready to make this service available in your catalog?
              </p>
              <button
                type="submit"
                className="btn-premium-primary w-full"
                disabled={loading}
              >
                {loading ? 'Saving...' : id ? 'Update Service' : duplicateId ? 'Create Duplicate' : 'Create Service'}
              </button>
              <button
                type="button"
                className="btn-premium-outline w-full mt-3"
                onClick={() => navigate('/services')}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ServiceFormPage;
