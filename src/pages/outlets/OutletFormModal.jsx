import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { createOutlet, fetchOutletProfile } from "../../services/mockApi";

export function OutletFormModal({ isOpen, onClose, outletId, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "",
    address: "",
    invoicePrefix: "",
    manager: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (outletId) {
        setLoading(true);
        fetchOutletProfile(outletId).then((data) => {
          setFormData({
            name: data.name,
            code: data.code || "",
            city: data.city,
            address: data.address || "",
            invoicePrefix: data.invoicePrefix || "",
            manager: data.manager,
          });
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setFormData({
          name: "",
          code: "",
          city: "",
          address: "",
          invoicePrefix: "",
          manager: "",
        });
      }
    }
  }, [isOpen, outletId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createOutlet({
        ...formData,
        id: outletId,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save outlet:", error);
      alert("Failed to save outlet");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-premium-in p-1">
        <div className="bg-white rounded-[2.2rem] overflow-hidden">
          <div className="px-10 py-8 border-b border-navy-50/50 flex items-center justify-between bg-navy-50/20">
            <div>
              <h2 className="text-2xl font-bold text-navy-900 leading-tight">
                {outletId ? "Edit Outlet" : "Add New Outlet"}
              </h2>
              <p className="text-xs font-medium text-navy-400 mt-1 uppercase tracking-[0.1em]">
                Configuration Portal
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-navy-50 rounded-2xl transition-all duration-200 group"
            >
              <X className="w-6 h-6 text-navy-300 group-hover:text-navy-600 group-active:scale-90" />
            </button>
          </div>

          <form className="p-10" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="premium-label">Outlet Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. HSR Layout"
                    className="premium-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="premium-label">Outlet Code</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g. HSR-01"
                    className="premium-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="premium-label">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Bengaluru"
                    className="premium-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="premium-label">Invoice Prefix</label>
                  <input
                    type="text"
                    name="invoicePrefix"
                    value={formData.invoicePrefix}
                    onChange={handleChange}
                    placeholder="e.g. HSR-"
                    className="premium-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="premium-label">Full Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter complete outlet address"
                  className="premium-input min-h-[100px] py-4"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="premium-label">Branch Manager</label>
                  <input
                    type="text"
                    name="manager"
                    value={formData.manager}
                    onChange={handleChange}
                    placeholder="Manager Name"
                    className="premium-input"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <button 
                type="button"
                onClick={onClose} 
                className="flex-1 btn-premium-outline"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 btn-premium-primary"
              >
                {loading ? (
                   <span className="flex items-center gap-2">
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     Saving...
                   </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {outletId ? "Update Outlet" : "Create Outlet"}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
