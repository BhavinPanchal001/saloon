import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/ui/PageHeader";
import {
  deletePackage,
  fetchPackageProfile,
  togglePackageStatus,
} from "../../../services/mockApi";
import { formatCurrency } from "../../../utils/format";
import { formatPackageValue } from "../utils/packageFormUtils";

const statusBadgeClassName = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-200 text-slate-700",
};

export function PackageProfilePage() {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const [servicePackage, setServicePackage] = useState(null);

  const loadPackage = async () => {
    const packageRecord = await fetchPackageProfile(packageId);
    setServicePackage(packageRecord);
  };

  useEffect(() => {
    loadPackage();
  }, [packageId]);

  const handleDelete = async () => {
    const shouldDelete = window.confirm(
      "Delete this package? This will remove it from the package directory and POS catalog.",
    );

    if (!shouldDelete) {
      return;
    }

    await deletePackage(packageId);
    navigate("/packages");
  };

  const handleStatusToggle = async () => {
    await togglePackageStatus(packageId);
    loadPackage();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Package Profile"
        title={servicePackage?.packageName || "Loading package"}
        description="Review pricing, availability, redemption rules, and the services included inside this package."
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/packages" className="btn-secondary">
              Back to Packages
            </Link>
            {servicePackage ? (
              <>
                <Link to={`/packages/${packageId}/edit`} className="btn-secondary">
                  Edit Package
                </Link>
                <button type="button" className="btn-secondary" onClick={handleStatusToggle}>
                  Mark {servicePackage.status === "active" ? "Inactive" : "Active"}
                </button>
                <button type="button" className="btn-secondary" onClick={handleDelete}>
                  Delete Package
                </button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Package Snapshot
            </p>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="font-semibold text-slate-900">Code</p>
                <p className="mt-1">{servicePackage?.packageCode || "--"}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="font-semibold text-slate-900">Category</p>
                <p className="mt-1">{formatPackageValue(servicePackage?.category)}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="font-semibold text-slate-900">Status</p>
                <span
                  className={`badge mt-2 ${
                    statusBadgeClassName[servicePackage?.status] || "bg-slate-200 text-slate-700"
                  }`}
                >
                  {formatPackageValue(servicePackage?.status)}
                </span>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="font-semibold text-slate-900">Validity</p>
                <p className="mt-1">{servicePackage?.validityDays || 0} days</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Pricing
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="text-sm text-slate-500">Package Price</p>
                <p className="mt-2 text-lg font-semibold text-brand-700">
                  {formatCurrency(servicePackage?.price)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="text-sm text-slate-500">Regular Price</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatCurrency(servicePackage?.totalOriginalPrice)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="text-sm text-slate-500">Savings</p>
                <p className="mt-2 text-lg font-semibold text-emerald-700">
                  {formatCurrency(servicePackage?.savings)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="text-sm text-slate-500">Duration</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {servicePackage?.totalDuration || 0} min
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Availability & Rules
            </p>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="font-semibold text-slate-900">Outlet Availability</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {servicePackage?.assignedOutletNames?.map((outletName) => (
                    <span key={outletName} className="badge bg-brand-50 text-brand-700">
                      {outletName}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="font-semibold text-slate-900">Sales Channels</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {servicePackage?.saleChannels?.map((channel) => (
                    <span key={channel} className="badge bg-slate-100 text-slate-700">
                      {formatPackageValue(channel)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/85 p-4">
                <p className="font-semibold text-slate-900">Rules</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Featured</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {servicePackage?.featured ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Online</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {servicePackage?.bookableOnline ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Prepaid
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {servicePackage?.prepaidOnly ? "Required" : "Optional"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Max redemptions per visit
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {servicePackage?.maxRedemptionsPerVisit || 1}
                  </p>
                </div>
                {servicePackage?.termsAndConditions ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Terms & Conditions
                    </p>
                    <p className="mt-2 leading-6 text-slate-600">
                      {servicePackage.termsAndConditions}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Included Services
            </p>
            <div className="mt-5 space-y-3">
              {servicePackage?.serviceItems?.map((serviceItem) => (
                <div
                  key={serviceItem.serviceId}
                  className="rounded-3xl border border-slate-100 bg-white/85 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{serviceItem.serviceName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {serviceItem.sessions} session(s) • {serviceItem.totalDuration} min
                      </p>
                    </div>
                    <p className="font-semibold text-brand-700">
                      {formatCurrency(serviceItem.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
