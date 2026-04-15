import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  deletePackage,
  fetchOutlets,
  fetchPackages,
  togglePackageStatus,
} from "../../services/mockApi";
import { formatCurrency } from "../../utils/format";
import { formatPackageValue } from "./packageFormUtils";

const statusBadgeClassName = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-200 text-slate-700",
};

export function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");

  const loadPackagesPage = async () => {
    const [packageList, outletList] = await Promise.all([fetchPackages(), fetchOutlets()]);
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
      active: packages.filter((servicePackage) => servicePackage.status === "active").length,
      featured: packages.filter((servicePackage) => servicePackage.featured).length,
      online: packages.filter((servicePackage) => servicePackage.bookableOnline).length,
    }),
    [packages],
  );

  const handleDelete = async (packageId) => {
    const shouldDelete = window.confirm(
      "Delete this package? It will be removed from the package directory and POS catalog.",
    );

    if (!shouldDelete) {
      return;
    }

    await deletePackage(packageId);
    loadPackagesPage();
  };

  const handleStatusToggle = async (packageId) => {
    await togglePackageStatus(packageId);
    loadPackagesPage();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Package Directory"
        description="Manage package pricing, service bundles, outlet availability, and sellability from one package control center."
        action={
          <Link to="/packages/new" className="btn-premium-primary">
            Add Package
          </Link>
        }
      />

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Packages", stats.total],
          ["Active", stats.active],
          ["Featured", stats.featured],
          ["Online Enabled", stats.online],
        ].map(([label, value]) => (
          <div key={label} className="stat-card">
            <p className="premium-label">{label}</p>
            <p className="mt-4 text-4xl font-black text-navy-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card mb-8">
        <div className="grid gap-6 md:grid-cols-[1.2fr_200px_220px]">
          <div>
            <label className="premium-label">Search Repository</label>
            <input
              className="premium-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name, code, category, or offer label"
            />
          </div>

          <div>
            <label className="premium-label">Status</label>
            <select
              className="premium-input appearance-none"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div>
            <label className="premium-label">Availability</label>
            <select
              className="premium-input appearance-none"
              value={outletFilter}
              onChange={(event) => setOutletFilter(event.target.value)}
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

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Package Detail</th>
              <th>Service Bundle</th>
              <th>Deployment</th>
              <th>Price Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.map((servicePackage) => (
              <tr key={servicePackage.id}>
                <td className="align-top py-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xl font-bold text-navy-900 leading-none">{servicePackage.packageName}</p>
                    <span
                      className={`status-badge ${
                        servicePackage.status === "active" ? "status-active" : "status-pending"
                      }`}
                    >
                      {formatPackageValue(servicePackage.status)}
                    </span>
                    {servicePackage.featured && (
                      <span className="status-badge bg-gold-100 text-gold-700">★ Featured</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    {servicePackage.packageCode} • {formatPackageValue(servicePackage.category)}
                  </p>
                  {servicePackage.offerLabel && (
                    <div className="mt-3 inline-block rounded-lg bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                      {servicePackage.offerLabel}
                    </div>
                  )}
                  <p className="mt-4 text-xs leading-relaxed text-slate-500 max-w-xs">{servicePackage.description}</p>
                </td>
                <td className="align-top py-8">
                  <div className="space-y-2">
                    {servicePackage.serviceItems.map((serviceItem) => (
                      <div key={serviceItem.serviceId} className="flex items-center gap-2 text-sm text-navy-800 font-medium">
                        <span className="h-1 w-1 rounded-full bg-navy-200"></span>
                        {serviceItem.serviceName} <span className="text-navy-300">× {serviceItem.sessions}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-gold-600">
                    {servicePackage.totalDuration} min session
                  </p>
                </td>
                <td className="align-top py-8">
                  <div className="flex flex-wrap gap-2">
                    {servicePackage.assignedOutletNames.map((outletName) => (
                      <span key={outletName} className="rounded-xl border border-navy-50 bg-white px-3 py-1.5 text-[10px] font-bold text-navy-700">
                        {outletName}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${servicePackage.bookableOnline ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                    <span className="text-xs font-medium text-slate-500">
                      {servicePackage.bookableOnline ? "Online Booking Ready" : "Front Desk Only"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{servicePackage.validityDays} days validity</p>
                </td>
                <td className="align-top py-8">
                  <p className="text-2xl font-black text-navy-900">
                    {formatCurrency(servicePackage.price)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 line-through">
                    Regular {formatCurrency(servicePackage.totalOriginalPrice)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-600">
                    Save {formatCurrency(servicePackage.savings)}
                  </p>
                </td>
                <td className="align-top py-8">
                  <div className="flex flex-col gap-2">
                    <Link to={`/packages/${servicePackage.id}/edit`} className="btn-premium-outline !py-2 !text-xs">
                      Edit Package
                    </Link>
                    <button
                      type="button"
                      className="btn-premium-outline !py-2 !text-xs"
                      onClick={() => handleStatusToggle(servicePackage.id)}
                    >
                      {servicePackage.status === "active" ? "Mark Inactive" : "Mark Active"}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold text-rose-400 hover:text-rose-600 p-2 transition"
                      onClick={() => handleDelete(servicePackage.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPackages.length === 0 ? (
              <tr>
                <td className="py-20 text-center text-slate-400 italic font-medium" colSpan={5}>
                  No packages match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

    </div>
  );
}
