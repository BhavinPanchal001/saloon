import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { fetchServices } from '../../../services/mockApi';
import { formatCurrency } from '../../../utils/format';
import { useToastStore } from '../../../stores/toastStore';
import { EmptyTable, NoSearchResults } from '../../../components/ui/EmptyState';
import '../styles/services.css';

const ServiceListPage: React.FC = () => {
  const [allServices, setAllServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const navigate = useNavigate();
  const toast = useToastStore();

  // Load services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        const data = await fetchServices();
        setAllServices(data);
        setFilteredServices(data);
      } catch (err) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, [toast]);

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
      result = result.filter(s => s.category === categoryFilter);
    }

    setFilteredServices(result);
  }, [searchQuery, categoryFilter, allServices]);

  // Calculate stats from actual data
  const stats = useMemo(() => {
    const total = allServices.length;
    const withProductLinkages = allServices.filter(s => s.productLinkages?.length > 0).length;
    const avgPrice = total > 0
      ? allServices.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0) / total
      : 0;

    return { total, withProductLinkages, avgPrice };
  }, [allServices]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setCategoryFilter('');
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
      <header className="module-header">
        <div className="module-title">
          <h1>Service Management</h1>
          <p>Define and manage your salon's service menu and product consumption.</p>
        </div>
        <button
          className="btn-premium-primary"
          onClick={() => navigate('/services/add')}
        >
          + Add New Service
        </button>
      </header>

      {/* Stats Summary Panel */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Total Services</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Active Menu Items</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.total}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Avg. Price</div>
          <div className="text-2xl font-bold mt-1 text-gold-600">
            {formatCurrency(stats.avgPrice)}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Consumption Tracked</div>
          <div className="text-2xl font-bold mt-1">{stats.withProductLinkages}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
          <input
            type="text"
            placeholder="Search services..."
            className="premium-input pl-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="premium-input sm:w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="hair">Hair</option>
          <option value="skin">Skin</option>
          <option value="nails">Nails</option>
        </select>
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
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => (
                <tr key={service.id}>
                  <td className="font-semibold text-navy-900">{service.serviceName}</td>
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
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        onClick={() => navigate(`/services/${service.id}`)}
                      >
                        View
                      </button>
                      <button
                        className="btn-premium-outline !py-1.5 !px-3 text-xs"
                        onClick={() => navigate(`/services/edit/${service.id}`)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ServiceListPage;
