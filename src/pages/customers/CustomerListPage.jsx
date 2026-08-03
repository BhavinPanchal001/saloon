import React, { useState, useEffect } from "react";
import { Users, Search, Plus, Phone, Mail, Award, DollarSign, Calendar, Eye, Edit2, Trash2, Wallet } from "lucide-react";
import { fetchCustomersAPI, createCustomerAPI, updateCustomerAPI, deleteCustomerAPI } from "../../services/api";
import { CustomerLedgerModal } from "../../components/customers/CustomerLedgerModal";
import { CustomerLoyaltyModal } from "../../components/customers/CustomerLoyaltyModal";

export function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);
  const [selectedLoyaltyCustomer, setSelectedLoyaltyCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "Female",
    dob: "",
    notes: "",
  });
  const [error, setError] = useState("");

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomersAPI({ search: searchTerm });
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  const handleOpenAddModal = () => {
    setEditingCustomerId(null);
    setFormData({ name: "", phone: "", email: "", gender: "Female", dob: "", notes: "" });
    setError("");
    setShowAddModal(true);
  };

  const handleEdit = (customer) => {
    let formattedDob = "";
    if (customer.dob) {
      const d = new Date(customer.dob);
      if (!isNaN(d.getTime())) {
        formattedDob = d.toISOString().split("T")[0];
      }
    }

    setEditingCustomerId(customer.id);
    setFormData({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      gender: customer.gender || "Female",
      dob: formattedDob,
      notes: customer.notes || "",
    });
    setError("");
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingCustomerId) {
        await updateCustomerAPI(editingCustomerId, formData);
      } else {
        await createCustomerAPI(formData);
      }
      setShowAddModal(false);
      setEditingCustomerId(null);
      setFormData({ name: "", phone: "", email: "", gender: "Female", dob: "", notes: "" });
      loadCustomers();
    } catch (err) {
      setError(err.message || "Failed to save customer profile.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteCustomerAPI(id);
      loadCustomers();
    } catch (err) {
      alert(err.message || "Failed to delete customer.");
    }
  };

  if (selectedLedgerCustomer) {
    return (
      <CustomerLedgerModal
        customer={selectedLedgerCustomer}
        onClose={() => setSelectedLedgerCustomer(null)}
        onUpdate={loadCustomers}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" /> Customer CRM
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage customer profiles, loyalty points, and purchase history.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-200"
        >
          <Plus className="w-5 h-5" /> Add Customer
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none text-slate-700 placeholder-slate-400 text-sm"
        />
      </div>

      {/* Customer Grid / Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Customers Found</h3>
          <p className="text-slate-400 text-sm mt-1">Get started by creating your first client profile.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Gender & DOB</th>
                  <th className="px-6 py-4">Total Visits</th>
                  <th className="px-6 py-4">Total Spend</th>
                  <th className="px-6 py-4">Loyalty Points</th>
                  <th className="px-6 py-4">Credit / Due</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.loyaltyTier && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                            style={{ backgroundColor: c.loyaltyTier.badge_color || "#b45309" }}
                          >
                            {c.loyaltyTier.name}
                          </span>
                        )}
                      </div>
                      {c.notes && <p className="text-xs text-slate-400 font-normal truncate max-w-xs">{c.notes}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-indigo-500" /> {c.phone}
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Mail className="w-3.5 h-3.5" /> {c.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {c.gender || "Unspecified"}
                      </span>
                      {c.dob && (
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {c.dob}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{c.total_visits || 0}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">
                      ₹{Number(c.total_spend || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedLoyaltyCustomer(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition-colors"
                        title="View Loyalty Points & History"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-500" /> {c.loyalty_points || 0} pts
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {Number(c.credit_balance || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          +₹{Number(c.credit_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} Credit
                        </span>
                      ) : Number(c.credit_balance || 0) < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                          -₹{Math.abs(Number(c.credit_balance)).toLocaleString("en-IN", { minimumFractionDigits: 2 })} Due
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">₹0.00</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedLoyaltyCustomer(c)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Loyalty Points & History"
                        >
                          <Award className="w-4 h-4 text-amber-500" />
                        </button>
                        <button
                          onClick={() => setSelectedLedgerCustomer(c)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View Ledger & Settle Balance"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Customer Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingCustomerId ? "Edit Customer Profile" : "Add New Customer"}
            </h3>
            {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
                <input
                  type="email"
                  placeholder="ananya@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes / Preferences</label>
                <textarea
                  rows="2"
                  placeholder="Hair type, preferences, allergies..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  {editingCustomerId ? "Update Profile" : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      {/* Customer Loyalty Modal */}
      {selectedLoyaltyCustomer && (
        <CustomerLoyaltyModal
          customerId={selectedLoyaltyCustomer.id}
          onClose={() => setSelectedLoyaltyCustomer(null)}
          onCustomerUpdated={() => {
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}
