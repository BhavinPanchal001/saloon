import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  Plus, 
  Trash2, 
  Store, 
  ChevronLeft, 
  Check, 
  Info,
  Zap,
  Tag,
  Clock,
  LayoutGrid,
  CreditCard,
  Globe,
  Monitor
} from "lucide-react";
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold-500 border-t-transparent"></div>
        <p className="mt-4 font-medium text-navy-400">Loading package details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-premium-in">
      <PageHeader
        eyebrow="Portfolio & Offers"
        title={isEditing ? "Edit Package" : "Create Package"}
        description="Design multi-service bundles that drive customer loyalty and higher ticket sizes. Configure rules once, sell across all outlets."
        action={
          <Link 
            to={isEditing ? `/packages/${packageId}` : "/packages"} 
            className="btn-premium-outline group"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Cancel
          </Link>
        }
      />

      <form className="grid gap-8 lg:grid-cols-[1fr_400px]" onSubmit={handleSubmit}>
        <div className="space-y-8">
          {/* Package Basics */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-navy-50/50 bg-navy-50/10 px-8 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600">
                <Tag className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Package Basics</h2>
            </div>
            
            <div className="p-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="col-span-2">
                  <label className="premium-label">Package Name</label>
                  <input
                    className="premium-input text-lg font-semibold"
                    value={form.packageName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, packageName: event.target.value }))
                    }
                    placeholder="E.g., Radiant Glow Ritual"
                  />
                </div>
                <div>
                  <label className="premium-label">Package Code</label>
                  <div className="relative">
                    <input
                      className="premium-input uppercase"
                      value={form.packageCode}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, packageCode: event.target.value.toUpperCase() }))
                      }
                      placeholder="PKG-X1"
                    />
                    <Info className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-200" />
                  </div>
                </div>
                <div>
                  <label className="premium-label">Category</label>
                  <select
                    className="premium-input"
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
                <div className="col-span-2">
                  <label className="premium-label">Short Description</label>
                  <textarea
                    className="premium-input min-h-[100px] resize-none leading-relaxed"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Describe what's included and who it's for..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Included Services */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy-50/50 bg-navy-50/10 px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-navy-900">Included Services</h2>
                  <p className="text-xs font-semibold text-navy-400">Total {packageSummary.serviceCount} services</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-premium-accent"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    services: [...current.services, createInitialServiceSelection()],
                  }))
                }
              >
                <Plus className="h-4 w-4" />
                Add Service
              </button>
            </div>

            <div className="divide-y divide-navy-50/50 p-6">
              {form.services.map((selection, index) => (
                <div
                  key={selection.id}
                  className="group flex flex-col gap-4 py-6 first:pt-2 last:pb-2 md:flex-row md:items-end"
                >
                  <div className="flex-1">
                    <label className="premium-label">Service {index + 1}</label>
                    <select
                      className="premium-input"
                      value={selection.serviceId}
                      onChange={(event) =>
                        updateServiceSelection(selection.id, "serviceId", event.target.value)
                      }
                    >
                      <option value="">Select a service...</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.serviceName} ({formatCurrency(service.price)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full md:w-32">
                    <label className="premium-label">Sessions</label>
                    <input
                      type="number"
                      min="1"
                      className="premium-input text-center"
                      value={selection.sessions}
                      onChange={(event) =>
                        updateServiceSelection(selection.id, "sessions", event.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
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
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Outlet Availability */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-navy-50/50 bg-navy-50/10 px-8 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-900">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-navy-900">Outlet Availability</h2>
                <p className="text-xs font-semibold text-navy-400 italic">Select outlets where this package is valid. Leave empty for all outlets.</p>
              </div>
            </div>

            <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
              {outlets.map((outlet) => {
                const isSelected = form.assignedOutletIds.includes(outlet.id);
                return (
                  <label
                    key={outlet.id}
                    className={`relative flex cursor-pointer flex-col gap-1 rounded-3xl border-2 p-5 transition-all duration-300 ${
                      isSelected 
                        ? "border-navy-500 bg-navy-50/30" 
                        : "border-navy-50/50 bg-white/50 hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => toggleOutlet(outlet.id)}
                    />
                    <div className="mb-2 flex justify-between">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                        isSelected ? "bg-navy-500 border-navy-500 text-white" : "border-navy-100"
                      }`}>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                    <span className={`font-bold transition-colors ${isSelected ? "text-navy-900" : "text-navy-700"}`}>
                      {outlet.name}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-navy-300">
                      {outlet.city}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Summary Widget */}
          <div className="glass-card shadow-2xl shadow-navy-900/10">
            <div className="h-2 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600"></div>
            <div className="p-8">
              <h3 className="premium-label mb-6 text-center text-navy-800">Package Summary</h3>
              
              <div className="space-y-5">
                <div className="flex justify-between border-b border-dashed border-navy-100 pb-4">
                  <span className="text-sm font-medium text-navy-400">Retail Value</span>
                  <span className="text-sm font-bold text-navy-900">{formatCurrency(packageSummary.regularPrice)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-navy-400">
                    <Clock className="h-4 w-4" />
                    Total Duration
                  </span>
                  <span className="text-sm font-bold text-navy-900">{packageSummary.totalDuration} min</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-navy-400">
                    <LayoutGrid className="h-4 w-4" />
                    Total Services
                  </span>
                  <span className="text-sm font-bold text-navy-900">{packageSummary.serviceCount}</span>
                </div>

                {packageSummary.savings > 0 && (
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
                    <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                      <Zap className="h-4 w-4" />
                      Total Savings
                    </span>
                    <span className="text-lg font-black">{formatCurrency(packageSummary.savings)}</span>
                  </div>
                )}

                <div className="mt-8 space-y-4">
                  <label className="premium-label">Current Set Price</label>
                  <div className="text-4xl font-black text-navy-900">
                    {formatCurrency(packageSummary.packagePrice)}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-premium-primary mt-10 w-full py-5 text-base"
                disabled={!form.packageName.trim() || packageSummary.serviceCount === 0 || isSaving}
              >
                {isSaving ? "Saving..." : isEditing ? "Update Package" : "Publish Package"}
              </button>
              
              <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-navy-200">
                Final price will be saved as {formatCurrency(packageSummary.packagePrice)}
              </p>
            </div>
          </div>

          {/* Pricing Rules */}
          <div className="glass-card p-8">
            <h3 className="premium-label mb-6">Pricing & Rules</h3>
            <div className="space-y-6">
              <div>
                <label className="premium-label flex justify-between">
                  Set Package Price
                  <span className="text-[9px] text-navy-300">(Leave empty for retail)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-navy-300">₹</span>
                  <input
                    type="number"
                    min="0"
                    className="premium-input pl-10"
                    value={form.packagePrice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, packagePrice: event.target.value }))
                    }
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="premium-label">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    className="premium-input"
                    value={form.validityDays}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, validityDays: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="premium-label text-nowrap">Redemptions / Visit</label>
                  <input
                    type="number"
                    min="1"
                    className="premium-input"
                    value={form.maxRedemptionsPerVisit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxRedemptionsPerVisit: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="premium-label">Sales Channels</label>
                <div className="grid grid-cols-3 gap-2">
                  {saleChannelOptions.map((channel) => {
                    const isSelected = form.saleChannels.includes(channel.value);
                    const getIcon = () => {
                      if (channel.value === 'pos') return <Monitor className="h-4 w-4" />;
                      if (channel.value === 'online') return <Globe className="h-4 w-4" />;
                      return <CreditCard className="h-4 w-4" />;
                    };
                    return (
                      <button
                        key={channel.value}
                        type="button"
                        onClick={() => toggleSaleChannel(channel.value)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all ${
                          isSelected 
                            ? "border-gold-500 bg-gold-50 text-gold-700" 
                            : "border-navy-50/50 text-navy-400 hover:border-navy-100"
                        }`}
                      >
                        {getIcon()}
                        <span className="text-[10px] font-bold uppercase tracking-wider">{channel.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="premium-label">Rules & Terms</label>
                <textarea
                  className="premium-input min-h-[120px] text-xs leading-relaxed"
                  value={form.termsAndConditions}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      termsAndConditions: event.target.value,
                    }))
                  }
                  placeholder="E.g., Valid on weekdays only, non-transferable..."
                />
              </div>

              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-navy-50 p-4 transition-colors hover:bg-navy-50/30">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-navy-200 transition-all checked:bg-navy-600 checked:border-navy-600"
                      checked={form.featured}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, featured: event.target.checked }))
                      }
                    />
                    <Check className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                  <span className="text-sm font-bold text-navy-700">Feature this package</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
