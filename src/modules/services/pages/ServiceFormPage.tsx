import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createService, fetchProductMasters, fetchServices, fetchServiceCategories } from '../../../services/mockApi';
import '../styles/services.css';

const createInitialLinkage = () => ({
  inventoryId: "",
  quantityUsed: 1,
});

const createInitialServiceForm = () => ({
  serviceName: "",
  category: "hair",
  price: "",
  duration: "",
  productLinkages: [createInitialLinkage()],
});

const ServiceFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState(createInitialServiceForm());

  useEffect(() => {
    const loadData = async () => {
      const [inventoryList, categoryList] = await Promise.all([
        fetchProductMasters(),
        fetchServiceCategories()
      ]);
      setInventory(inventoryList);
      setCategories(categoryList);

      if (id) {
        const serviceList = await fetchServices();
        const service = serviceList.find((s: any) => s.id === id);
        if (service) {
          setForm(service);
        }
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
      await createService({
        ...form,
        productLinkages: cleanedLinkages,
      });
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
                {form.productLinkages.map((linkage, index) => (
                  <div key={index} className="linkage-row">
                    <div className="form-field">
                      <label>Inventory Item</label>
                      <select
                        className="premium-input"
                        value={linkage.inventoryId}
                        onChange={(e) => updateLinkage(index, "inventoryId", e.target.value)}
                      >
                        <option value="">Select Item</option>
                        {inventory.map((item) => (
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
                        min="1"
                        className="premium-input"
                        value={linkage.quantityUsed}
                        onChange={(e) => updateLinkage(index, "quantityUsed", e.target.value)}
                      />
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
                  </div>
                ))}
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
