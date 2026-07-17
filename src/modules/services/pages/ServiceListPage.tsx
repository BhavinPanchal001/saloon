import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Trash2, Eye, Pencil, Copy } from 'lucide-react';
import { fetchServicesFromAPI, fetchServiceCategoriesFromAPI, fetchProductsFromAPI, deleteServiceAPI, fetchOutletsFromAPI } from '../../../services/api';
import { formatCurrency } from '../../../utils/format';
import { useToastStore } from '../../../stores/toastStore';
import { EmptyTable, NoSearchResults } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import '../styles/services.css';

const ServiceListPage: React.FC = () => {
  const [allServices, setAllServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [outlets, setOutlets] = useState<any[]>([]);
  const navigate = useNavigate();
  const toast = useToastStore();

  // Load services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        const [rawServices, catList, productList, outletList] = await Promise.all([
          fetchServicesFromAPI(),
          fetchServiceCategoriesFromAPI(),
          fetchProductsFromAPI(),
          fetchOutletsFromAPI(),
        ]);
        const mapped = rawServices.map((s: any) => ({
          ...s,
          serviceName: s.service_name,
          productLinkages: s.product_linkages || [],
          categoryName: s.category?.name || '',
          assignedOutletIds: s.assignedOutletIds || [],
        }));
        setAllServices(mapped);
        setFilteredServices(mapped);
        setCategories(catList);
        setProducts(productList);
        setOutlets(outletList);
      } catch (err) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  // Apply search and filter
  useEffect(() => {
    let result = [...allServices];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.serviceName?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(s => String(s.category_id) === categoryFilter);
    }

    // Apply product filter
    if (productFilter) {
      result = result.filter(s =>
        (s.productLinkages || []).some((l: any) => String(l.inventoryId) === productFilter)
      );
    }

    // Apply duration range
    if (minDuration !== '') result = result.filter(s => Number(s.duration) >= Number(minDuration));
    if (maxDuration !== '') result = result.filter(s => Number(s.duration) <= Number(maxDuration));

    // Apply price range
    if (minPrice !== '') result = result.filter(s => parseFloat(s.price) >= parseFloat(minPrice));
    if (maxPrice !== '') result = result.filter(s => parseFloat(s.price) <= parseFloat(maxPrice));

    setFilteredServices(result);
  }, [searchQuery, categoryFilter, productFilter, minDuration, maxDuration, minPrice, maxPrice, allServices]);

  // Calculate stats from actual data
  const stats = useMemo(() => {
    const total = allServices.length;
    const withProductLinkages = allServices.filter(s => s.productLinkages?.length > 0).length;
    const avgPrice = total > 0
      ? allServices.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0) / total
      : 0;

    return { total, withProductLinkages, avgPrice };
  }, [allServices]);

  const hasActiveFilters = searchQuery || categoryFilter || productFilter || minDuration || maxDuration || minPrice || maxPrice;

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteServiceAPI(deleteId);
      setAllServices(prev => prev.filter(s => s.id !== deleteId));
      toast.success('Service deleted successfully');
    } catch (err) {
      toast.error('Failed to delete service');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setProductFilter('');
    setMinDuration('');
    setMaxDuration('');
    setMinPrice('');
    setMaxPrice('');
  };

  if (loading) {
    return (
      <div className="services-module">
        <header className="module-header">
          <div className="module-title">
            <h1>Service Management</h1>
            <p>Define and manage your salon's service menu and product consumption.</p>
          </div>
        </header>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-navy-500" />
          <p className="text-sm font-medium text-navy-500">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="services-module">
      <PageHeader
        title="Service Management"
        description="Define and manage your salon's service menu and product consumption."
        action={
          <button
            className="btn-premium-primary"
            onClick={() => navigate('/services/add')}
          >
            + Add New Service
          </button>
        }
      />

      {/* Stats Summary Panel */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 mb-3">
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Total Services</span>
          <span className="text-base font-bold text-navy-900">{stats.total}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Active Menu</span>
          <span className="text-base font-bold text-emerald-600">{stats.total}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Avg. Price</span>
          <span className="text-base font-bold text-gold-600">
            {formatCurrency(stats.avgPrice)}
          </span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Linked Products</span>
          <span className="text-base font-bold text-navy-800">{stats.withProductLinkages}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-3 mb-4 space-y-3">
        {/* Row 1: Search + Category + Product */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
            <input
              type="text"
              placeholder="Search services..."
              className="premium-input pl-12 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="premium-input sm:w-44"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
            ))}
          </select>
          <select
            className="premium-input sm:w-48"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.itemName}</option>
            ))}
          </select>
        </div>
        {/* Row 2: Duration + Price ranges */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Duration (min)</span>
          <input
            type="number"
            min="0"
            placeholder="Min"
            className="premium-input sm:w-24"
            value={minDuration}
            onChange={(e) => setMinDuration(e.target.value)}
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            className="premium-input sm:w-24"
            value={maxDuration}
            onChange={(e) => setMaxDuration(e.target.value)}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap sm:ml-4">Price (RM)</span>
          <input
            type="number"
            min="0"
            placeholder="Min"
            className="premium-input sm:w-24"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            className="premium-input sm:w-24"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          {hasActiveFilters && (
            <button
              onClick={handleClearSearch}
              className="ml-auto text-xs font-medium text-rose-500 hover:text-rose-700 whitespace-nowrap"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Services Table */}
      {filteredServices.length === 0 ? (
        searchQuery ? (
          <NoSearchResults query={searchQuery} onClear={handleClearSearch} />
        ) : (
          <EmptyTable
            title="No services yet"
            description="Get started by adding your first service to the menu."
            actionLabel="Add Service"
            onAction={() => navigate('/services/add')}
          />
        )
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Product Linkage</th>
                <th>Outlets</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => (
                <tr key={service.id}>
                  <td className="font-semibold text-navy-900">{service.serviceName || service.service_name}</td>
                  <td className="font-medium">{formatCurrency(service.price)}</td>
                  <td>{service.duration} min</td>
                  <td className="text-sm">
                    {service.productLinkages?.length ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-navy-100 text-navy-700">
                        {service.productLinkages.length} product(s)
                      </span>
                    ) : (
                      <span className="text-navy-400 italic">No linked products</span>
                    )}
                  </td>
                  <td className="text-sm">
                    {service.assignedOutletIds?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {outlets
                          .filter((o) => service.assignedOutletIds.includes(o.id))
                          .map((o) => (
                            <span key={o.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gold-50 text-gold-700 border border-gold-200">
                              {o.name}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        All Outlets
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="View"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
                        onClick={() => navigate(`/services/${service.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        title="Edit"
                        className="rounded-lg border border-navy-200 bg-navy-50 p-1.5 text-navy-700 transition-colors hover:bg-navy-100"
                        onClick={() => navigate(`/services/edit/${service.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title="Duplicate"
                        className="rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 text-indigo-700 transition-colors hover:bg-indigo-100"
                        onClick={() => navigate(`/services/add?duplicate=${service.id}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        title="Delete"
                        className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-700 transition-colors hover:bg-rose-100"
                        onClick={() => setDeleteId(service.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-navy-900">Delete Service</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold">{allServices.find(s => s.id === deleteId)?.serviceName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn-premium-outline !py-2 !px-4 text-sm"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceListPage;
