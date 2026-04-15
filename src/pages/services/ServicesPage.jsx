import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { createService, fetchProductMasters, fetchServices } from "../../services/mockApi";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../utils/format";

const createInitialLinkage = () => ({
  inventoryId: "",
  quantityUsed: 1,
});

const createInitialServiceForm = () => ({
  serviceName: "",
  price: "",
  duration: "",
  productLinkages: [createInitialLinkage()],
});

export function ServicesPage() {
  const user = useAuthStore((state) => state.user);
  const [services, setServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(createInitialServiceForm);

  const loadServicesPage = async () => {
    const [serviceList, inventoryList] = await Promise.all([
      fetchServices(),
      fetchProductMasters(),
    ]);

    setServices(serviceList);
    setInventory(inventoryList);
  };

  useEffect(() => {
    if (user) {
      loadServicesPage();
    }
  }, [user]);

  const updateLinkage = (index, key, value) => {
    setForm((current) => ({
      ...current,
      productLinkages: current.productLinkages.map((linkage, linkageIndex) =>
        linkageIndex === index ? { ...linkage, [key]: value } : linkage,
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanedLinkages = form.productLinkages.filter((linkage) => linkage.inventoryId);

    await createService({
      ...form,
      productLinkages: cleanedLinkages,
    });

    setForm(createInitialServiceForm());
    loadServicesPage();
  };

  const inventoryNameById = Object.fromEntries(
    inventory.map((item) => [item.id, item.itemName]),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Services"
        description="Build the salon menu and define which products get consumed per service so stock deduction will be backend-ready later."
      />

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Product Linkage</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="font-bold text-navy-900">{service.serviceName}</td>
                  <td>{formatCurrency(service.price)}</td>
                  <td>{service.duration} min</td>
                  <td className="text-xs text-slate-500 italic">
                    {service.productLinkages.length
                      ? service.productLinkages
                          .map(
                            (linkage) =>
                              `${inventoryNameById[linkage.inventoryId] || linkage.inventoryId} x ${linkage.quantityUsed}`,
                          )
                          .join(", ")
                      : "No linked products"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-card">
          <p className="premium-label">Service Builder</p>
          <h2 className="mt-2 text-3xl text-navy-900">Define your menu</h2>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="premium-label">Service Name</label>
              <input
                className="premium-input"
                value={form.serviceName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceName: event.target.value }))
                }
                placeholder="Keratin smoothening, global color..."
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="premium-label">Price ($)</label>
                <input
                  type="number"
                  className="premium-input"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="premium-label">Duration (min)</label>
                <input
                  type="number"
                  className="premium-input"
                  value={form.duration}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, duration: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-gold-200 bg-gold-50/40 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-navy-900">Product Consumption</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Define inventory usage per session.
                  </p>
                </div>
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
                  Add Linkage
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {form.productLinkages.map((linkage, index) => (
                  <div key={`${linkage.inventoryId}-${index}`} className="grid gap-3 md:grid-cols-[1fr_120px_45px]">
                    <select
                      className="premium-input appearance-none"
                      style={{ padding: '0.75rem 1rem' }}
                      value={linkage.inventoryId}
                      onChange={(event) => updateLinkage(index, "inventoryId", event.target.value)}
                    >
                      <option value="">Select Item</option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      className="premium-input"
                      style={{ padding: '0.75rem 1rem' }}
                      value={linkage.quantityUsed}
                      onChange={(event) => updateLinkage(index, "quantityUsed", event.target.value)}
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
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

            <button type="submit" className="btn-premium-primary w-full shadow-navy-500/20">
              Save to Catalog
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
