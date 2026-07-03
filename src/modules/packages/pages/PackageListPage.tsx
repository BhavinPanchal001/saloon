import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchPackagesFromAPI,
  deletePackageAPI,
  togglePackageStatusAPI,
  fetchOutletsFromAPI,
} from '../../../services/api';
import { formatCurrency } from '../../../utils/format';
import { formatPackageValue } from '../utils/packageFormUtils';
import { PageHeader } from '../../../components/ui/PageHeader';
import '../styles/packages.css';

const PackageListPage: React.FC = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");
  const navigate = useNavigate();

  const loadPackagesPage = async () => {
    const [packageList, outletList] = await Promise.all([fetchPackagesFromAPI(), fetchOutletsFromAPI()]);
    setPackages(packageList);
    setOutlets(outletList);
  };

  useEffect(() => {
    loadPackagesPage();
  }, []);

  const filteredPackages = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return packages.filter((servicePackage) => {
      const matchesSearch =
        !searchValue ||
        [
          servicePackage.packageName,
          servicePackage.packageCode,
          servicePackage.offerLabel,
          servicePackage.description,
          servicePackage.category,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchValue));

      const matchesStatus =
        statusFilter === "all" || servicePackage.status === statusFilter;

      const matchesOutlet =
        outletFilter === "all" ||
        !servicePackage.assignedOutletIds.length ||
        servicePackage.assignedOutletIds.includes(outletFilter);

      return matchesSearch && matchesStatus && matchesOutlet;
    });
  }, [outletFilter, packages, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: packages.length,
      active: packages.filter((p) => p.status === "active").length,
      featured: packages.filter((p) => p.featured).length,
      online: packages.filter((p) => p.bookableOnline).length,
    }),
    [packages]
  );

  const handleDelete = async (packageId: string) => {
    if (window.confirm("Delete this package? It will be removed from the catalog.")) {
      await deletePackageAPI(packageId);
      loadPackagesPage();
    }
  };

  const handleStatusToggle = async (packageId: string) => {
    await togglePackageStatusAPI(packageId);
    loadPackagesPage();
  };

  return (
    <div className="packages-module">
      <PageHeader
        title="Package Management"
        description="Design, price, and deploy service bundles across your network."
        action={
          <button 
            className="btn-premium-primary"
            onClick={() => navigate('/packages/new')}
          >
            + Add New Package
          </button>
        }
      />

      {/* Stats Summary Panel */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 mb-3">
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Active Bundles</span>
          <span className="text-base font-bold text-navy-900">{stats.active}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Online Enabled</span>
          <span className="text-base font-bold text-emerald-600">{stats.online}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Featured</span>
          <span className="text-base font-bold text-amber-600">{stats.featured}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Total Directory</span>
          <span className="text-base font-bold text-navy-800">{stats.total}</span>
        </div>
      </div>

      <div className="glass-card mb-8" style={{ padding: '1.5rem' }}>
        <div className="grid gap-6 md:grid-cols-[1.2fr_200px_220px]">
          <div>
            <label className="premium-label">Search Packages</label>
            <input
              className="premium-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, code, or category..."
            />
          </div>

          <div>
            <label className="premium-label">Status</label>
            <select
              className="premium-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div>
            <label className="premium-label">Outlet Availability</label>
            <select
              className="premium-input"
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
            >
              <option value="all">All outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Package Details</th>
              <th>Service Bundle</th>
              <th>Availability</th>
              <th>Pricing</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.map((p) => (
              <tr key={p.id}>
                <td style={{ verticalAlign: 'top' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-navy-900">{p.packageName}</p>
                    <span className={p.status === 'active' ? 'package-badge-active' : 'package-badge-inactive'}>
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {p.packageCode} • {p.category}
                  </p>
                  {p.offerLabel && (
                    <span className="mt-2 inline-block bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      {p.offerLabel}
                    </span>
                  )}
                </td>
                <td style={{ verticalAlign: 'top' }}>
                  <div className="space-y-1">
                    {p.serviceItems?.map((item: any) => (
                      <div key={item.serviceId} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                        {item.serviceName} <span className="text-xs text-slate-400">×{item.sessions}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td style={{ verticalAlign: 'top' }}>
                   <div className="flex flex-wrap gap-1">
                    {p.assignedOutletNames?.map((name: string) => (
                      <span key={name} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        {name}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ verticalAlign: 'top' }}>
                  <p className="text-xl font-bold text-navy-900">{formatCurrency(p.price)}</p>
                  <p className="text-[10px] text-slate-400 line-through">Reg. {formatCurrency(p.totalOriginalPrice)}</p>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                    <button 
                      className="btn-premium-outline !py-1 !px-3 text-[10px]"
                      onClick={() => navigate(`/packages/${p.id}`)}
                    >
                      View
                    </button>
                    <button 
                      className="btn-premium-outline !py-1 !px-3 text-[10px]"
                      onClick={() => navigate(`/packages/${p.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button 
                      className="text-[10px] font-bold text-slate-500 hover:text-navy-900 transition mt-1"
                      onClick={() => handleStatusToggle(p.id)}
                    >
                      {p.status === 'active' ? 'Disable' : 'Enable'}
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

export default PackageListPage;
