import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchServices } from '../../../services/mockApi';
import { formatCurrency } from '../../../utils/format';
import '../styles/services.css';

const ServiceListPage: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadServices = async () => {
      const data = await fetchServices();
      setServices(data);
    };
    loadServices();
  }, []);

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Services</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>{services.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Active Menu Items</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', color: '#10b981' }}>{services.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Avg. Price</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', color: '#f59e0b' }}>
            {formatCurrency(services.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0) / (services.length || 1))}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Consumption Tracked</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>
            {services.filter(s => s.productLinkages?.length > 0).length}
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <input 
            type="text" 
            placeholder="Search services..." 
            className="search-input"
            onChange={(e) => {
              const query = e.target.value.toLowerCase();
              // In a real app we'd filter here, but for now we follow the pattern
            }}
          />
        </div>
        <select className="premium-input" style={{ width: '200px' }}>
          <option value="">All Categories</option>
          <option value="hair">Hair</option>
          <option value="skin">Skin</option>
          <option value="nails">Nails</option>
        </select>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Price</th>
              <th>Duration</th>
              <th>Product Linkage</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td className="font-bold text-navy-900">{service.serviceName}</td>
                <td>{formatCurrency(service.price)}</td>
                <td>{service.duration} min</td>
                <td className="text-xs text-slate-500 italic">
                  {service.productLinkages?.length
                    ? `${service.productLinkages.length} product(s) linked`
                    : "No linked products"}
                </td>
                <td style={{ textAlign: 'right' }}>
                   <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-premium-outline !py-1 !px-3 text-xs"
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
    </div>
  );
};

export default ServiceListPage;
