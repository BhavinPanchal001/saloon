import React, { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  fetchCouponsFromAPI,
  createCouponAPI,
  updateCouponAPI,
  deleteCouponAPI,
} from "../../services/api";

export function CouponManagementPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const initialFormState = {
    code: "",
    title: "",
    description: "",
    discount_type: "percent",
    discount_value: "",
    min_spend: "",
    max_discount_amount: "",
    valid_from: "",
    valid_until: "",
    usage_limit: "",
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetchCouponsFromAPI();
      if (res.success) {
        setCoupons(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
      setErrorMsg("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData(initialFormState);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      title: coupon.title || "",
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_spend: coupon.min_spend || "",
      max_discount_amount: coupon.max_discount_amount || "",
      valid_from: coupon.valid_from ? coupon.valid_from.split("T")[0] : "",
      valid_until: coupon.valid_until ? coupon.valid_until.split("T")[0] : "",
      usage_limit: coupon.usage_limit || "",
      is_active: coupon.is_active,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const res = await deleteCouponAPI(id);
      if (res.success) {
        setSuccessMsg("Coupon deleted successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
        loadCoupons();
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete coupon");
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const res = await updateCouponAPI(coupon.id, { is_active: !coupon.is_active });
      if (res.success) {
        loadCoupons();
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to toggle status");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        discount_value: parseFloat(formData.discount_value) || 0,
        min_spend: formData.min_spend ? parseFloat(formData.min_spend) : 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null,
      };

      let res;
      if (editingCoupon) {
        res = await updateCouponAPI(editingCoupon.id, payload);
      } else {
        res = await createCouponAPI(payload);
      }

      if (res.success) {
        setSuccessMsg(editingCoupon ? "Coupon updated successfully" : "Coupon created successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
        setIsModalOpen(false);
        loadCoupons();
      }
    } catch (err) {
      setErrorMsg(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Coupon Management"
        subtitle="Create and manage promotional discount codes for your customers."
        action={
          <button
            onClick={handleOpenCreateModal}
            className="btn-premium-primary"
          >
            <Plus size={16} />
            <span>Create Coupon</span>
          </button>
        }
      />

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && !isModalOpen && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="glass-card flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search coupon code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-input !pl-10"
          />
        </div>
        <div className="flex gap-6 text-xs font-bold uppercase tracking-wider text-navy-600">
          <span>Total Coupons: <strong className="text-navy-900 text-sm ml-1">{coupons.length}</strong></span>
          <span>Active: <strong className="text-emerald-600 text-sm ml-1">{coupons.filter(c => c.is_active).length}</strong></span>
        </div>
      </div>

      {/* Coupon List Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Tag size={40} className="text-navy-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No coupons found. Click "Create Coupon" to add one!</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Spend</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-navy-50/50 transition">
                  <td className="font-mono font-bold text-navy-900">
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-amber-200">
                      {coupon.code}
                    </span>
                    {coupon.title && (
                      <span className="block font-sans font-medium text-xs text-navy-500 mt-1">
                        {coupon.title}
                      </span>
                    )}
                  </td>
                  <td className="font-bold text-navy-900">
                    {coupon.discount_type === "percent" ? (
                      <span>{coupon.discount_value}% OFF</span>
                    ) : (
                      <span>₹{coupon.discount_value} OFF</span>
                    )}
                    {coupon.max_discount_amount > 0 && (
                      <span className="block text-xs text-navy-400 font-normal">
                        Max: ₹{coupon.max_discount_amount}
                      </span>
                    )}
                  </td>
                  <td className="text-navy-600">
                    {coupon.min_spend > 0 ? `₹${coupon.min_spend}` : "None"}
                  </td>
                  <td className="text-xs text-navy-600">
                    <div>From: {coupon.valid_from ? coupon.valid_from.split("T")[0] : "Anytime"}</div>
                    <div>Until: {coupon.valid_until ? coupon.valid_until.split("T")[0] : "No Expiry"}</div>
                  </td>
                  <td className="text-navy-600 text-xs">
                    <span className="font-bold text-navy-900">{coupon.used_count || 0}</span>
                    {coupon.usage_limit ? ` / ${coupon.usage_limit}` : " (Unlimited)"}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleStatus(coupon)}
                      className={`status-badge text-xs px-3 py-1 cursor-pointer transition ${
                        coupon.is_active
                          ? "status-active hover:opacity-80"
                          : "status-danger hover:opacity-80"
                      }`}
                    >
                      {coupon.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(coupon)}
                        className="rounded-xl p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="rounded-xl p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Coupon Modal Form matching Glowy theme */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-navy-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold-500" />
                  {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
                </h2>
                <p className="text-xs text-navy-500">
                  Configure discount code rules and restrictions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-navy-400 hover:bg-navy-50 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="premium-label block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER50"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="premium-input uppercase font-mono tracking-wider font-bold text-navy-900"
                />
              </div>

              <div>
                <label className="premium-label block mb-1">Title / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Special 50% Off"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="premium-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="premium-label block mb-1">Discount Type *</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="premium-input"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="premium-label block mb-1">Discount Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder={formData.discount_type === "percent" ? "20" : "100"}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="premium-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="premium-label block mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={formData.min_spend}
                    onChange={(e) => setFormData({ ...formData, min_spend: e.target.value })}
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="premium-label block mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unlimited"
                    value={formData.max_discount_amount}
                    onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                    className="premium-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="premium-label block mb-1">Valid From</label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="premium-label block mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="premium-input"
                  />
                </div>
              </div>

              <div>
                <label className="premium-label block mb-1">Usage Limit (Times)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="premium-input"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-navy-600 border-slate-300 focus:ring-navy-500"
                />
                <label htmlFor="is_active" className="text-sm font-semibold text-navy-800">
                  Active (Coupon can be used at checkout)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-premium-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-premium-primary disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingCoupon ? "Save Changes" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
