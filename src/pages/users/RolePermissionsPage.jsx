import React, { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { ConfirmModal } from "../../components/ui/Modal";
import {
  fetchRolesFromAPI,
  saveRoleAPI,
  toggleRoleStatusAPI,
  deleteRoleAPI,
} from "../../services/api";
import { useToastStore } from "../../stores/toastStore";
import {
  Shield,
  Plus,
  Search,
  CheckCircle,
  Edit2,
  Trash2,
  Lock,
  Check,
  CreditCard,
  Package,
  Scissors,
  Wallet,
  Users,
} from "lucide-react";

// Categorized System Permissions
const permissionCategories = [
  {
    category: "POS & Billing",
    icon: CreditCard,
    permissions: [
      { key: "pos:view", label: "View Point of Sale & Bills History" },
      { key: "pos:create", label: "Perform Checkout & Generate Invoices" },
    ],
  },
  {
    category: "Inventory & Stock",
    icon: Package,
    permissions: [
      { key: "inventory:view", label: "View Outlet Stock & Catalog" },
      { key: "inventory:manage", label: "Manage Purchase Orders & Stock Transfers" },
    ],
  },
  {
    category: "Services & Packages",
    icon: Scissors,
    permissions: [
      { key: "services:view", label: "View Services & Package Catalog" },
      { key: "services:manage", label: "Create & Edit Services and Packages" },
    ],
  },
  {
    category: "Finance & Expenses",
    icon: Wallet,
    permissions: [
      { key: "expenses:view", label: "View Expenses & Outlet Budgets" },
      { key: "expenses:create", label: "Create & Record New Expenses" },
      { key: "expenses:delete", label: "Delete Recorded Expenses" },
    ],
  },
  {
    category: "User Access & Security",
    icon: Users,
    permissions: [
      { key: "users:view", label: "View App Users & Roles" },
      { key: "users:manage", label: "Add & Manage App Users & Roles" },
    ],
  },
];

export default function RolePermissionsPage() {
  const toast = useToastStore();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    isActive: true,
    permissions: [],
  });

  // Delete State
  const [deletingRole, setDeletingRole] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const rolesData = await fetchRolesFromAPI();
      setRoles(rolesData);
    } catch (err) {
      toast.error(err.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRole(null);
    setFormData({
      id: null,
      name: "",
      description: "",
      isActive: true,
      permissions: ["pos:view", "inventory:view"],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role) => {
    setEditingRole(role);
    setFormData({
      id: role.id,
      name: role.name,
      description: role.description || "",
      isActive: role.isActive,
      permissions: role.permissions || [],
    });
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (permKey) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permKey);
      const updated = exists
        ? prev.permissions.filter((k) => k !== permKey)
        : [...prev.permissions, permKey];
      return { ...prev, permissions: updated };
    });
  };

  const handleCategoryToggle = (categoryObj) => {
    const catKeys = categoryObj.permissions.map((p) => p.key);
    const allSelected = catKeys.every((k) => formData.permissions.includes(k));

    setFormData((prev) => {
      let updated;
      if (allSelected) {
        // Deselect category
        updated = prev.permissions.filter((k) => !catKeys.includes(k));
      } else {
        // Select all in category
        updated = Array.from(new Set([...prev.permissions, ...catKeys]));
      }
      return { ...prev, permissions: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Role name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await saveRoleAPI(formData);
      toast.success(
        editingRole ? `Role ${formData.name} updated!` : `Role ${formData.name} created!`
      );
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to save role.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (role) => {
    try {
      const res = await toggleRoleStatusAPI(role.id);
      toast.success("Role status updated.");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to toggle role status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRole) return;
    try {
      await deleteRoleAPI(deletingRole.id);
      toast.success("Role deleted successfully.");
      setDeletingRole(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to delete role.");
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        eyebrow="User Access & Security"
        title="Roles & Permissions Management"
        description="Configure application roles and assign granular feature permissions for staff and system accounts."
        action={
          <button onClick={handleOpenAddModal} className="btn-premium-primary">
            <Plus size={18} /> Create New Role
          </button>
        }
      />

      {/* Search Bar */}
      <div className="glass-card !p-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            className="premium-input !pl-11 !py-3"
            placeholder="Search roles by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-600" />
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Shield size={40} className="text-navy-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No roles found matching your search.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => (
            <div key={role.id} className="glass-card !p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-50 text-navy-700 font-bold">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy-900 text-base">{role.name}</h3>
                      <button
                        onClick={() => handleToggleStatus(role)}
                        className={`status-badge text-[10px] px-2.5 py-0.5 mt-0.5 cursor-pointer ${
                          role.isActive ? "status-active" : "status-danger"
                        }`}
                      >
                        {role.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(role)}
                      className="rounded-xl border border-navy-100 p-2 text-navy-600 hover:bg-navy-50 transition"
                      title="Edit Permissions"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingRole(role)}
                      className="rounded-xl border border-red-100 p-2 text-red-600 hover:bg-red-50 transition"
                      title="Delete Role"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-navy-500 min-h-[32px]">
                  {role.description || "No description provided."}
                </p>
              </div>

              {/* Permissions list preview */}
              <div className="pt-4 border-t border-navy-100/60">
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-2">
                  Assigned Permissions ({role.permissions?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions?.length > 0 ? (
                    role.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded-lg bg-navy-50 px-2 py-1 text-[11px] font-medium text-navy-700 border border-navy-100"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-navy-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-navy-900">
                  {editingRole ? `Edit Role: ${editingRole.name}` : "Create New System Role"}
                </h2>
                <p className="text-xs text-navy-500">
                  Define the role details and check allowed feature permissions below.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-navy-400 hover:bg-navy-50 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="premium-label block mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    className="premium-input"
                    placeholder="e.g. Senior Cashier"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="premium-label block mb-1">Description</label>
                  <input
                    type="text"
                    className="premium-input"
                    placeholder="Brief description of responsibilities..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Permission Matrix */}
              <div>
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider mb-3">
                  Permission Matrix
                </h3>
                <div className="space-y-4">
                  {permissionCategories.map((catObj) => {
                    const CategoryIcon = catObj.icon;
                    const catKeys = catObj.permissions.map((p) => p.key);
                    const allSelected = catKeys.every((k) =>
                      formData.permissions.includes(k)
                    );

                    return (
                      <div
                        key={catObj.category}
                        className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4"
                      >
                        <div className="flex items-center justify-between border-b border-navy-100/60 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <CategoryIcon size={16} className="text-navy-600" />
                            <span className="font-bold text-sm text-navy-900">
                              {catObj.category}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCategoryToggle(catObj)}
                            className="text-xs font-semibold text-navy-600 hover:text-navy-900 underline"
                          >
                            {allSelected ? "Deselect Category" : "Select All"}
                          </button>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {catObj.permissions.map((perm) => {
                            const isChecked = formData.permissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                                  isChecked
                                    ? "bg-navy-900 border-navy-900 text-white"
                                    : "bg-white border-navy-100 text-navy-700 hover:bg-navy-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handlePermissionToggle(perm.key)}
                                  className="hidden"
                                />
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition ${
                                    isChecked
                                      ? "bg-gold-500 border-gold-500 text-navy-950 font-bold"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isChecked && <Check size={13} strokeWidth={3} />}
                                </div>
                                <span className="text-xs font-medium leading-tight">
                                  {perm.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
                  {submitting ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRole && (
        <ConfirmModal
          isOpen={Boolean(deletingRole)}
          onClose={() => setDeletingRole(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Role"
          message={`Are you sure you want to delete the role "${deletingRole.name}"? This action cannot be undone.`}
          confirmText="Delete Role"
          type="danger"
        />
      )}
    </div>
  );
}
