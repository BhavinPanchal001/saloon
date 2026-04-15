import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  fetchOutlets,
  fetchPackageProfile,
  fetchServices,
  savePackage,
} from "../../services/mockApi";
import { formatCurrency } from "../../utils/format";
import {
  createInitialPackageForm,
  createInitialServiceSelection,
  mapPackageToForm,
  packageCategoryOptions,
  saleChannelOptions,
} from "./packageFormUtils";

export function PackageFormPage() {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const isEditing = Boolean(packageId);
  const [form, setForm] = useState(createInitialPackageForm());
  const [services, setServices] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setIsLoading(true);

      try {
        const [serviceList, outletList, packageRecord] = await Promise.all([
          fetchServices(),
          fetchOutlets(),
          isEditing ? fetchPackageProfile(packageId) : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setServices(serviceList);
        setOutlets(outletList);
        setForm(packageRecord ? mapPackageToForm(packageRecord) : createInitialPackageForm());
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [isEditing, packageId]);

  const serviceOptionsById = useMemo(
    () => Object.fromEntries(services.map((service) => [service.id, service])),
    [services],
  );

  const packageSummary = useMemo(() => {
    const selectedServices = form.services
      .filter((selection) => selection.serviceId)
      .map((selection) => {
        const service = serviceOptionsById[selection.serviceId];

        if (!service) {
          return null;
        }

        const sessions = Math.max(1, Number(selection.sessions) || 1);

        return {
          serviceId: service.id,
          serviceName: service.serviceName,
          sessions,
          totalPrice: service.price * sessions,
          totalDuration: service.duration * sessions,
        };
      })
      .filter(Boolean);

    const regularPrice = selectedServices.reduce((sum, service) => sum + service.totalPrice, 0);
    const totalDuration = selectedServices.reduce(
      (sum, service) => sum + service.totalDuration,
      0,
    );
    const enteredPrice = Number(form.packagePrice);
    const packagePrice =
      Number.isFinite(enteredPrice) && enteredPrice > 0 ? enteredPrice : regularPrice;

    return {
      serviceCount: selectedServices.length,
      selectedServices,
      regularPrice,
      totalDuration,
      packagePrice,
      savings: Math.max(regularPrice - packagePrice, 0),
    };
  }, [form.packagePrice, form.services, serviceOptionsById]);

  const updateServiceSelection = (rowId, key, value) => {
    setForm((current) => ({
      ...current,
      services: current.services.map((selection) =>
        selection.id === rowId ? { ...selection, [key]: value } : selection,
      ),
    }));
  };

  const toggleOutlet = (outletId) => {
    setForm((current) => ({
      ...current,
      assignedOutletIds: current.assignedOutletIds.includes(outletId)
        ? current.assignedOutletIds.filter((id) => id !== outletId)
        : [...current.assignedOutletIds, outletId],
    }));
  };

  const toggleSaleChannel = (channel) => {
    setForm((current) => {
      const hasChannel = current.saleChannels.includes(channel);
      const saleChannels = hasChannel
        ? current.saleChannels.filter((value) => value !== channel)
        : [...current.saleChannels, channel];

      return {
        ...current,
        saleChannels: saleChannels.length ? saleChannels : [channel],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanedServices = form.services.filter((selection) => selection.serviceId);

    if (!form.packageName.trim() || cleanedServices.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const savedPackage = await savePackage({
        id: packageId,
        ...form,
        validityDays: Number(form.validityDays) || 30,
        packagePrice: form.packagePrice || packageSummary.regularPrice,
        maxRedemptionsPerVisit: Number(form.maxRedemptionsPerVisit) || 1,
        services: cleanedServices.map((selection) => ({
          serviceId: selection.serviceId,
          sessions: Number(selection.sessions) || 1,
        })),
      });

      navigate(`/packages/${savedPackage.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          eyebrow="Packages"
          title={isEditing ? "Edit Package" : "Create Package"}
          description="Loading package setup..."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Packages"
        title={isEditing ? "Edit Package" : "Create Package"}
        description="Define pricing, services, outlet availability, and sales rules in one place so the package is ready for selling and redemption."
        action={
          <Link to={isEditing ? `/packages/${packageId}` : "/packages"} className="btn-secondary">
            {isEditing ? "Back to Package" : "Back to Packages"}
          </Link>
        }
      />

      <form className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Package Basics
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-text">Package Name</label>
                <input
                  className="input-field"
                  value={form.packageName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, packageName: event.target.value }))
                  }
                  placeholder="Color maintenance ritual"
                />
              </div>
              <div>
                <label className="label-text">Package Code</label>
                <input
                  className="input-field"
                  value={form.packageCode}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, packageCode: event.target.value }))
                  }
                  placeholder="PKG-2045"
                />
              </div>
              <div>
                <label className="label-text">Offer Label</label>
                <input
                  className="input-field"
                  value={form.offerLabel}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, offerLabel: event.target.value }))
                  }
                  placeholder="Best seller"
                />
              </div>
              <div>
                <label className="label-text">Category</label>
                <select
                  className="select-field"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  {packageCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="label-text">Description</label>
              <textarea
                className="input-field min-h-[120px]"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Tell the team who this package is for and what value it delivers."
              />
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Included Services
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Choose the services inside the package and how many sessions are included.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    services: [...current.services, createInitialServiceSelection()],
                  }))
                }
              >
                Add Service
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {form.services.map((selection) => (
                <div
                  key={selection.id}
                  className="grid gap-3 md:grid-cols-[1fr_150px_96px]"
                >
                  <select
                    className="select-field"
                    value={selection.serviceId}
                    onChange={(event) =>
                      updateServiceSelection(selection.id, "serviceId", event.target.value)
                    }
                  >
                    <option value="">Select Service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.serviceName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={selection.sessions}
                    onChange={(event) =>
                      updateServiceSelection(selection.id, "sessions", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        services:
                          current.services.length === 1
                            ? [createInitialServiceSelection()]
                            : current.services.filter((item) => item.id !== selection.id),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Outlet Availability
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Leave every outlet unchecked if this package should be redeemable everywhere.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {outlets.map((outlet) => (
                <label
                  key={outlet.id}
                  className="flex items-start gap-3 rounded-3xl border border-slate-100 bg-white/85 px-4 py-4 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={form.assignedOutletIds.includes(outlet.id)}
                    onChange={() => toggleOutlet(outlet.id)}
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">{outlet.name}</span>
                    <span className="mt-1 block text-slate-500">{outlet.city}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Pricing & Rules
            </p>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-text">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={form.validityDays}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, validityDays: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label-text">Package Price</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.packagePrice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, packagePrice: event.target.value }))
                    }
                    placeholder={`Default ${formatCurrency(packageSummary.regularPrice)}`}
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Max Redemptions Per Visit</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={form.maxRedemptionsPerVisit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxRedemptionsPerVisit: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="label-text">Status</label>
                <select
                  className="select-field"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="grid gap-3">
                <label className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white/85 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, featured: event.target.checked }))
                    }
                  />
                  Mark as featured package
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white/85 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.bookableOnline}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bookableOnline: event.target.checked,
                      }))
                    }
                  />
                  Allow online booking
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white/85 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.prepaidOnly}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, prepaidOnly: event.target.checked }))
                    }
                  />
                  Require prepayment
                </label>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Sales Channels
            </p>
            <div className="mt-4 grid gap-3">
              {saleChannelOptions.map((channel) => (
                <label
                  key={channel.value}
                  className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white/85 px-4 py-4 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={form.saleChannels.includes(channel.value)}
                    onChange={() => toggleSaleChannel(channel.value)}
                  />
                  {channel.label}
                </label>
              ))}
            </div>

            <div className="mt-5">
              <label className="label-text">Terms & Conditions</label>
              <textarea
                className="input-field min-h-[120px]"
                value={form.termsAndConditions}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    termsAndConditions: event.target.value,
                  }))
                }
                placeholder="Add redemption rules, expiry handling, and any front desk guidance."
              />
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Summary
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Included services</span>
                <span>{packageSummary.serviceCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Regular price</span>
                <span>{formatCurrency(packageSummary.regularPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Package price</span>
                <span>{formatCurrency(packageSummary.packagePrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total duration</span>
                <span>{packageSummary.totalDuration} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Savings</span>
                <span className="text-emerald-700">
                  {formatCurrency(packageSummary.savings)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary mt-6 w-full"
              disabled={!form.packageName.trim() || packageSummary.serviceCount === 0 || isSaving}
            >
              {isSaving ? "Saving..." : isEditing ? "Update Package" : "Save Package"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
