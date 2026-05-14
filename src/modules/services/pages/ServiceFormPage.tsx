import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchServiceByIdFromAPI,
  createServiceAPI,
  updateServiceAPI,
  fetchServiceCategoriesFromAPI,
} from '../../../services/api';
import { fetchProductMasters } from '../../../services/mockApi';
import { getAvailableUnits, getUnitAbbr, convertToBase } from '../../../utils/unitConversion';
import { ImageUpload } from '../../../components/ui/ImageUpload';
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
}

const createInitialLinkage = (): ProductLinkage => ({
  inventoryId: "",
  quantityUsed: 1,
  consumptionUnit: "primary",
});

const createInitialServiceForm = (): ServiceForm => ({
  serviceName: "",
  category: "hair",
  price: "",
  duration: "",
  images: [],
  productLinkages: [createInitialLinkage()],
});

const ServiceFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<ServiceForm>(createInitialServiceForm());

  useEffect(() => {
    const loadData = async () => {
      const [inventoryList, categoryList] = await Promise.all([
        fetchProductMasters(),
        fetchServiceCategoriesFromAPI(),
      ]);
      setInventory(inventoryList);
      setCategories(categoryList);

      if (id) {
        const service = await fetchServiceByIdFromAPI(id);
        setForm({
          serviceName: service.service_name || '',
          category: service.category_id ? String(service.category_id) : '',
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
        });
      }
    };
    loadData();
  }, [id]);

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
          <h1>{id ? 'Edit Service' : 'Add New Service'}</h1>
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
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <ImageUpload
                  label="Service Images"
                  value={form.images}
                  onChange={(images: string[]) => setForm({ ...form, images })}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024}
                  multiple={true}
                  maxImages={5}
                />
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
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Specify the inventory items and quantities used during this service.
              </p>

              <div className="space-y-4">
                {form.productLinkages.map((linkage, index) => {
                  const selectedProduct = inventory.find((p: any) => p.id === linkage.inventoryId);
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
                    <div key={index} className="linkage-row" style={{ gridTemplateColumns: '1fr 100px 120px 45px' }}>
                      <div className="form-field">
                        <label>Product</label>
                        <select
                          className="premium-input"
                          value={linkage.inventoryId}
                          onChange={(e) => {
                            updateLinkage(index, "inventoryId", e.target.value);
                            // Reset unit to product's default consumption unit
                            const prod = inventory.find((p: any) => p.id === e.target.value);
                            if (prod) {
                              updateLinkage(index, "consumptionUnit", prod.consumptionUnit || "primary");
                            }
                          }}
                        >
                          <option value="">Select Item</option>
                          {inventory.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.itemName}
                            </option>
                          ))}
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
                      {showConversion && baseEquiv !== null ? (
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#64748b', padding: '0.25rem 0 0' }}>
                          = {baseEquiv.toFixed(4).replace(/\.?0+$/, '')} {baseAbbr} (base unit)
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
                {loading ? 'Saving...' : id ? 'Update Service' : 'Create Service'}
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
