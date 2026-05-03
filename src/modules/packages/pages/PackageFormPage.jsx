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
  Monitor,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import {
  fetchOutlets,
  fetchPackageProfile,
  fetchServices,
  savePackage,
  fetchServiceCategories,
} from "../../../services/mockApi";
import { formatCurrency } from "../../../utils/format";
import {
  createInitialPackageForm,
  createInitialServiceSelection,
  mapPackageToForm,
  packageCategoryOptions,
  saleChannelOptions,
} from "../utils/packageFormUtils";
import "../styles/packages.css";

export function PackageFormPage() {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const isEditing = Boolean(packageId);
  const [form, setForm] = useState(createInitialPackageForm());
  const [services, setServices] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basics");

  const tabs = [
    { id: "basics", label: "Basics", icon: <Tag size={18} /> },
    { id: "bundle", label: "Service Bundle", icon: <LayoutGrid size={18} /> },
    { id: "availability", label: "Availability", icon: <Store size={18} /> },
    { id: "pricing", label: "Pricing & Rules", icon: <CreditCard size={18} /> },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setIsLoading(true);

      try {
        const [serviceList, outletList, categoryList, packageRecord] = await Promise.all([
          fetchServices(),
          fetchOutlets(),
          fetchServiceCategories(),
          isEditing ? fetchPackageProfile(packageId) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setServices(serviceList);
        setOutlets(outletList);
        setCategories(categoryList);
        setForm(packageRecord ? mapPackageToForm(packageRecord) : createInitialPackageForm());
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPage();
    return () => { isMounted = false; };
  }, [isEditing, packageId]);

  const serviceOptionsById = useMemo(
    () => Object.fromEntries(services.map((service) => [service.id, service])),
    [services]
  );

  const packageSummary = useMemo(() => {
    const selectedServices = form.services
      .filter((selection) => selection.serviceId)
      .map((selection) => {
        const service = serviceOptionsById[selection.serviceId];
        if (!service) return null;
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
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.totalDuration, 0);
    const enteredPrice = Number(form.packagePrice);
    const packagePrice = Number.isFinite(enteredPrice) && enteredPrice > 0 ? enteredPrice : regularPrice;

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
      return { ...current, saleChannels: saleChannels.length ? saleChannels : [channel] };
    });
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    const cleanedServices = form.services.filter((selection) => selection.serviceId);
    if (!form.packageName.trim() || cleanedServices.length === 0) return;
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

  const nextTab = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    } else {
      handleSubmit();
    }
  };

  const prevTab = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
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
    <div className="packages-module">
      <header className="module-header">
        <div className="module-title">
          <Link to="/packages" className="flex items-center gap-1.5 text-navy-600 hover:text-navy-900 font-bold transition-colors mb-2">
            <ChevronLeft size={16} />
            Back to Directory
          </Link>
          <h1>{isEditing ? "Edit Package" : "Add New Package"}</h1>
          <p>Design and configure your service bundles effortlessly.</p>
        </div>
      </header>

      <div className="form-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="glass-card" style={{ padding: '2rem' }}>
          {activeTab === "basics" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="form-section-title">General Information</h2>
              <div className="grid gap-6">
                <div className="form-field">
                  <label className="premium-label">Package Name</label>
                  <input
                    className="premium-input"
                    value={form.packageName}
                    onChange={(e) => setForm({ ...form, packageName: e.target.value })}
                    placeholder="e.g. Wedding Special, Monsoon Glow"
                  />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="form-field">
                    <label className="premium-label">Package Code</label>
                    <input
                      className="premium-input uppercase"
                      value={form.packageCode}
                      onChange={(e) => setForm({ ...form, packageCode: e.target.value.toUpperCase() })}
                      placeholder="PKG-001"
                    />
                  </div>
                  <div className="form-field">
                    <label className="premium-label">Category</label>
                    <select
                      className="premium-input"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label className="premium-label">Offer Label (Optional)</label>
                  <input
                    className="premium-input"
                    value={form.offerLabel}
                    onChange={(e) => setForm({ ...form, offerLabel: e.target.value })}
                    placeholder="e.g. Best Seller, Limited Time"
                  />
                </div>
                <div className="form-field">
                  <label className="premium-label">Description</label>
                  <textarea
                    className="premium-input min-h-[120px]"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Add details about what this package offers..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "bundle" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="form-section-title" style={{ margin: 0 }}>Service Bundle</h2>
                 <button
                    type="button"
                    className="btn-premium-outline !py-2 !px-4 text-xs"
                    onClick={() => setForm({ ...form, services: [...form.services, createInitialServiceSelection()] })}
                  >
                    + Add Service
                  </button>
               </div>
               <div className="space-y-4">
                  {form.services.map((selection, index) => (
                    <div key={selection.id} className="service-selection-item">
                      <div className="form-field">
                        <label className="premium-label">Service {index + 1}</label>
                        <select
                          className="premium-input"
                          value={selection.serviceId}
                          onChange={(e) => updateServiceSelection(selection.id, "serviceId", e.target.value)}
                        >
                          <option value="">Select Service</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.serviceName} ({formatCurrency(s.price)})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label className="premium-label">Sessions</label>
                        <input
                          type="number"
                          min="1"
                          className="premium-input text-center"
                          value={selection.sessions}
                          onChange={(e) => updateServiceSelection(selection.id, "sessions", e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all h-[42px] w-[42px]"
                        onClick={() => setForm({
                          ...form,
                          services: form.services.length === 1 ? [createInitialServiceSelection()] : form.services.filter(s => s.id !== selection.id)
                        })}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === "availability" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="form-section-title">Outlet Availability</h2>
              <p className="text-sm text-slate-500 mb-6 italic">Select outlets where this bundle can be redeemed. Leave empty to allow in all outlets.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {outlets.map((outlet) => {
                  const isSelected = form.assignedOutletIds.includes(outlet.id);
                  return (
                    <label key={outlet.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-navy-600 bg-navy-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300 text-navy-600 focus:ring-navy-600"
                        checked={isSelected}
                        onChange={() => toggleOutlet(outlet.id)}
                      />
                      <div>
                        <p className="font-bold text-navy-900">{outlet.name}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{outlet.city}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="form-section-title">Pricing & Rules</h2>
              <div className="grid gap-8">
                 <div className="grid gap-6 md:grid-cols-2">
                    <div className="form-field">
                      <label className="premium-label">Package Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">RM </span>
                        <input
                          type="number"
                          className="premium-input pl-14"
                          value={form.packagePrice}
                          onChange={(e) => setForm({ ...form, packagePrice: e.target.value })}
                          placeholder={packageSummary.regularPrice.toString()}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="premium-label">Validity (Days)</label>
                      <input
                        type="number"
                        className="premium-input"
                        value={form.validityDays}
                        onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
                      />
                    </div>
                 </div>

                 <div className="form-field">
                    <label className="premium-label">Select Sales Channels</label>
                    <div className="grid grid-cols-3 gap-3">
                       {saleChannelOptions.map(channel => {
                         const isSelected = form.saleChannels.includes(channel.value);
                         return (
                           <button
                             key={channel.value}
                             type="button"
                             onClick={() => toggleSaleChannel(channel.value)}
                             className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                           >
                             {channel.value === 'online' ? <Globe size={20} /> : channel.value === 'pos' ? <Monitor size={20} /> : <CreditCard size={20} />}
                             <span className="text-[10px] font-bold uppercase tracking-widest">{channel.label}</span>
                           </button>
                         );
                       })}
                    </div>
                 </div>

                 <div className="form-field">
                    <label className="premium-label border border-slate-100 p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition">
                      <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded"
                        checked={form.featured}
                        onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-navy-900">Feature this package</p>
                        <p className="text-xs text-slate-500">Highlighted on customer portal and dashboards.</p>
                      </div>
                    </label>
                 </div>

                 <div className="form-field">
                    <label className="premium-label">Terms & Conditions</label>
                    <textarea
                      className="premium-input min-h-[100px]"
                      value={form.termsAndConditions}
                      onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
                      placeholder="e.g. Non-refundable, valid on weekdays only..."
                    />
                 </div>
              </div>
            </div>
          )}

          <div className="stepper-footer">
             <button 
                className="btn-premium-outline"
                type="button"
                onClick={prevTab}
                disabled={activeTab === "basics"}
             >
               Previous Step
             </button>
             <button 
                className="btn-premium-primary"
                type="button"
                onClick={nextTab}
             >
               {activeTab === "pricing" ? (
                 <>
                   <ShieldCheck size={18} />
                   {isSaving ? 'Processing...' : isEditing ? 'Update Package' : 'Publish Package'}
                 </>
               ) : (
                 <>
                   Next Step
                   <ChevronRight size={18} />
                 </>
               )}
             </button>
          </div>
        </div>

        <div className="space-y-6">
           <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 className="premium-label mb-6 text-center">Package Summary</h3>
              <div className="space-y-4">
                 <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                    <span className="text-slate-500">Retail Value</span>
                    <span className="font-bold text-navy-900">{formatCurrency(packageSummary.regularPrice)}</span>
                 </div>
                 <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                    <span className="text-slate-500">Included Services</span>
                    <span className="font-bold text-navy-900">{packageSummary.serviceCount} items</span>
                 </div>
                 <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                    <span className="text-slate-500">Total Duration</span>
                    <span className="font-bold text-navy-900">{packageSummary.totalDuration} min</span>
                 </div>
                 {packageSummary.savings > 0 && (
                   <div className="flex justify-between text-sm py-3 px-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold">
                      <span>Total Savings</span>
                      <span>{formatCurrency(packageSummary.savings)}</span>
                   </div>
                 )}
                 <div className="pt-4 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Selling Price</p>
                    <p className="text-4xl font-black text-navy-900">{formatCurrency(packageSummary.packagePrice)}</p>
                 </div>
              </div>
           </div>

           <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 className="premium-label mb-4">Preview</h3>
              <div className="p-4 rounded-3xl border-2 border-gold-400/20 bg-gold-50/10">
                 <p className="text-xs font-bold text-gold-600 mb-1">{form.packageCode || 'PKG-XXX'}</p>
                 <h4 className="text-lg font-bold text-navy-900">{form.packageName || 'Untitled Package'}</h4>
                 <p className="text-xs text-slate-500 line-clamp-2 mt-1">{form.description || 'No description provided.'}</p>
                 <div className="mt-4 flex items-center justify-between">
                    <span className="text-xl font-black text-navy-900">{formatCurrency(packageSummary.packagePrice)}</span>
                    <span className="text-[10px] bg-navy-900 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {form.category}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
