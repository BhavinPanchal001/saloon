import React, { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { ConfirmModal } from "../../components/ui/Modal";
import {
  fetchUsersFromAPI,
  createUserAPI,
  updateUserAPI,
  toggleUserStatusAPI,
  deleteUserAPI,
  fetchOutletsFromAPI,
} from "../../services/api";
import { useToastStore } from "../../stores/toastStore";
import {
  User,
  Plus,
  Search,
  Shield,
  Store,
  CheckCircle,
  Edit2,
  Trash2,
  Mail,
  Key,
} from "lucide-react";

const creatableRoles = [
  { value: "manager", label: "Outlet Manager" },
  { value: "cashier", label: "Cashier / POS Operator" },
];

const availableRoles = [
  { value: "manager", label: "Outlet Manager" },
  { value: "cashier", label: "Cashier / POS Operator" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export default function UserManagementPage() {
  const toast = useToastStore();
  const [users, setUsers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager",
    outlet_id: "",
  });

  // Delete State
  const [deletingUser, setDeletingUser] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, outletsData] = await Promise.all([
        fetchUsersFromAPI(),
        fetchOutletsFromAPI(),
      ]);
      setUsers(usersData);
      setOutlets(outletsData);
    } catch (err) {
      toast.error(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "manager",
      outlet_id: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role || "manager",
      outlet_id: user.outlet_id ? String(user.outlet_id) : "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error("Password is required for new accounts.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        outlet_id: formData.outlet_id ? Number(formData.outlet_id) : null,
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (editingUser) {
        await updateUserAPI(editingUser.id, payload);
        toast.success(`User ${formData.name} updated successfully!`);
      } else {
        await createUserAPI(payload);
        toast.success(`App User ${formData.name} created successfully!`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to save user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await toggleUserStatusAPI(user.id);
      toast.success(res.message);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      await deleteUserAPI(deletingUser.id);
      toast.success("User deleted successfully.");
      setDeletingUser(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to delete user.");
    }
  };

  // Filtered List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesOutlet =
      outletFilter === "all" ||
      (outletFilter === "unassigned" ? !u.outlet_id : String(u.outlet_id) === outletFilter);

    return matchesSearch && matchesRole && matchesOutlet;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="User Access & Security"
        title="App Users Management"
        description="Manage standalone system users, login credentials, role assignments, and single-outlet permissions."
        action={
          <button onClick={handleOpenAddModal} className="btn-premium-primary">
            <Plus size={18} /> Add App User
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card !p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-500/10 text-navy-600">
            <User size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Total Users</p>
            <p className="mt-1 text-2xl font-black text-navy-900">{users.length}</p>
          </div>
        </div>
        <div className="glass-card !p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Active Accounts</p>
            <p className="mt-1 text-2xl font-black text-navy-900">
              {users.filter((u) => u.is_active).length}
            </p>
          </div>
        </div>
        <div className="glass-card !p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-600">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Managers & Staff</p>
            <p className="mt-1 text-2xl font-black text-navy-900">
              {users.filter((u) => u.role !== "super_admin").length}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card !p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              className="premium-input !pl-11 !py-3"
              placeholder="Search by user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-navy-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="premium-input !py-2.5 !text-xs !w-40"
              >
                <option value="all">All Roles</option>
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Outlet Filter */}
            <div className="flex items-center gap-2">
              <Store size={14} className="text-navy-400" />
              <select
                value={outletFilter}
                onChange={(e) => setOutletFilter(e.target.value)}
                className="premium-input !py-2.5 !text-xs !w-44"
              >
                <option value="all">All Outlets</option>
                <option value="unassigned">All Outlets (Global)</option>
                {outlets.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <User size={40} className="text-navy-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No App Users found matching your criteria.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Assigned Outlet</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-navy-50/50 transition">
                  <td className="font-bold text-navy-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-100 text-navy-700 font-black text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="text-navy-600">{u.email}</td>
                  <td>
                    <span
                      className={`status-badge text-xs px-3 py-1 ${
                        u.role === "super_admin"
                          ? "bg-purple-100 text-purple-700 border-purple-200"
                          : u.role === "manager"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : u.role === "admin"
                          ? "status-active"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                    >
                      {u.role ? u.role.replace("_", " ").toUpperCase() : "ADMIN"}
                    </span>
                  </td>
                  <td>
                    <span className="text-navy-700 text-sm font-medium">
                      {u.outlet ? (
                        <span className="inline-flex items-center gap-1.5 text-navy-800">
                          <Store size={14} className="text-gold-500" />
                          {u.outlet.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">All Outlets (Global)</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`status-badge text-xs px-3 py-1 cursor-pointer transition ${
                        u.is_active ? "status-active hover:opacity-80" : "status-danger hover:opacity-80"
                      }`}
                      title="Click to toggle status"
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="rounded-xl border border-navy-100 p-2 text-navy-600 hover:bg-navy-50 transition"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingUser(u)}
                        className="rounded-xl border border-red-100 p-2 text-red-600 hover:bg-red-50 transition"
                        title="Delete User"
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

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-navy-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-navy-900">
                  {editingUser ? "Edit App User" : "Add New App User"}
                </h2>
                <p className="text-xs text-navy-500">
                  {editingUser
                    ? `Update account details for ${editingUser.name}`
                    : "Create a login account and assign their single outlet scope."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-navy-400 hover:bg-navy-50 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="premium-label block mb-1">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type="text"
                    required
                    className="premium-input !pl-10"
                    placeholder="e.g. Alex Johnson"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="premium-label block mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type="email"
                    required
                    className="premium-input !pl-10"
                    placeholder="user@glowysalon.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="premium-label block mb-1">
                  Password {editingUser && <span className="text-xs font-normal text-navy-400">(Leave blank to keep unchanged)</span>}
                </label>
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type="password"
                    required={!editingUser}
                    className="premium-input !pl-10"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="premium-label block mb-1">Role</label>
                  <select
                    className="premium-input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {creatableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="premium-label block mb-1">Assigned Single Outlet</label>
                  <select
                    className="premium-input"
                    value={formData.outlet_id}
                    onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
                  >
                    <option value="">All Outlets (Global)</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-navy-200 px-5 py-2.5 text-xs font-bold text-navy-600 hover:bg-navy-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-premium-primary"
                >
                  {submitting ? "Saving..." : editingUser ? "Update User" : "Create App User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <ConfirmModal
          isOpen={Boolean(deletingUser)}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete App User Account"
          message={`Are you sure you want to delete the account for ${deletingUser.name}? This action cannot be undone.`}
          confirmText="Delete Account"
          type="danger"
        />
      )}
    </div>
  );
}
