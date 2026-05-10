import { useEffect, useState, useMemo } from "react";
import { X, Search, Ruler, ArrowLeftRight, ToggleLeft, ToggleRight, Trash2, Edit3, Plus } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  fetchUnitMasters,
  saveUnitMaster,
  deleteUnitMaster,
  toggleUnitMasterStatus,
} from "../../services/mockApi";

const initialForm = {
  groupName: "",
  primaryUnit: "",
  primaryAbbr: "",
  secondaryUnit: "",
  secondaryAbbr: "",
  conversionRatio: "",
  status: "active",
};

export function UnitMasterPage() {
  const [units, setUnits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const loadUnits = async () => {
    const data = await fetchUnitMasters();
    setUnits(data);
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    const q = searchQuery.toLowerCase();
    return units.filter(
      (u) =>
        u.groupName.toLowerCase().includes(q) ||
        u.primaryUnit.toLowerCase().includes(q) ||
        u.secondaryUnit.toLowerCase().includes(q) ||
        u.primaryAbbr.toLowerCase().includes(q) ||
        u.secondaryAbbr.toLowerCase().includes(q),
    );
  }, [units, searchQuery]);

  const resetMessages = () => {
    setFeedback("");
    setErrorMessage("");
  };

  const openCreateModal = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsModalOpen(true);
    resetMessages();
  };

  const openEditModal = (unit) => {
    setForm({
      groupName: unit.groupName,
      primaryUnit: unit.primaryUnit,
      primaryAbbr: unit.primaryAbbr,
      secondaryUnit: unit.secondaryUnit,
      secondaryAbbr: unit.secondaryAbbr,
      conversionRatio: String(unit.conversionRatio),
      status: unit.status,
    });
    setEditingId(unit.id);
    setIsModalOpen(true);
    resetMessages();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!form.groupName.trim() || !form.primaryUnit.trim() || !form.secondaryUnit.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (!form.conversionRatio || Number(form.conversionRatio) <= 0) {
      setErrorMessage("Conversion ratio must be a positive number.");
      return;
    }

    try {
      await saveUnitMaster({
        ...(editingId ? { id: editingId } : {}),
        ...form,
        conversionRatio: Number(form.conversionRatio),
      });
      setIsModalOpen(false);
      setForm(initialForm);
      setEditingId(null);
      setFeedback(editingId ? "Unit group updated successfully." : "Unit group created successfully.");
      await loadUnits();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save unit group.");
    }
  };

  const handleToggleStatus = async (id) => {
    resetMessages();
    try {
      await toggleUnitMasterStatus(id);
      setFeedback("Status toggled.");
      await loadUnits();
    } catch (error) {
      setErrorMessage(error.message || "Unable to toggle status.");
    }
  };

  const handleDelete = async (id) => {
    resetMessages();
    try {
      await deleteUnitMaster(id);
      setDeleteConfirmId(null);
      setFeedback("Unit group deleted.");
      await loadUnits();
    } catch (error) {
      setDeleteConfirmId(null);
      setErrorMessage(error.message);
    }
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Unit Master"
        description="Define measurement unit groups with primary and secondary units. These groups are used across Products, Purchase Orders, and Services."
        action={
          <button type="button" className="btn-premium-primary" onClick={openCreateModal}>
            <Plus size={16} className="mr-2 inline" />
            Add Unit Group
          </button>
        }
      />

      {feedback ? (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search unit groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-input !pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <section className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Primary Unit</th>
              <th>Secondary Unit</th>
              <th>Conversion</th>
              <th>Status</th>
              <th style={{ width: "140px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  {searchQuery ? "No matching unit groups found." : "No unit groups created yet."}
                </td>
              </tr>
            ) : (
              filteredUnits.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50">
                        <Ruler size={14} className="text-navy-600" />
                      </div>
                      <span className="font-bold text-navy-900">{unit.groupName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {unit.primaryUnit} ({unit.primaryAbbr})
                    </span>
                  </td>
                  <td>
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                      {unit.secondaryUnit} ({unit.secondaryAbbr})
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm">
                      <ArrowLeftRight size={12} className="text-slate-400" />
                      <span className="font-semibold text-navy-800">
                        1 {unit.primaryAbbr} = {unit.conversionRatio} {unit.secondaryAbbr}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(unit.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        unit.status === "active"
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {unit.status === "active" ? (
                        <ToggleRight size={14} />
                      ) : (
                        <ToggleLeft size={14} />
                      )}
                      {unit.status === "active" ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(unit)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-navy-50 hover:text-navy-700"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      {deleteConfirmId === unit.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(unit.id)}
                            className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-600"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(unit.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 transition-colors hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Info Card */}
      <div className="mt-8 glass-card">
        <p className="text-xs font-black uppercase tracking-widest text-gold-700">How Unit Groups Work</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-navy-100 bg-white p-4">
            <p className="text-sm font-bold text-navy-900">📦 Products</p>
            <p className="mt-1 text-xs text-slate-500 leading-5">
              Assign a unit group to each product. Choose which unit you purchase in and which unit you consume in.
            </p>
          </div>
          <div className="rounded-2xl border border-navy-100 bg-white p-4">
            <p className="text-sm font-bold text-navy-900">🛒 Purchase Orders</p>
            <p className="mt-1 text-xs text-slate-500 leading-5">
              Buy stock in any unit — the system converts to the base unit automatically for consistent tracking.
            </p>
          </div>
          <div className="rounded-2xl border border-navy-100 bg-white p-4">
            <p className="text-sm font-bold text-navy-900">✂️ Services</p>
            <p className="mt-1 text-xs text-slate-500 leading-5">
              Define product consumption per service in any unit. Stock deduction is auto-converted at billing.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm">
          <div className="card-solid w-full max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl text-navy-900">
                  {editingId ? "Edit Unit Group" : "Create Unit Group"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define a measurement group with primary and secondary units.
                </p>
              </div>
              <button
                type="button"
                className="btn-premium-outline !p-2 rounded-full"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="premium-label">Unit Group Name</label>
                <input
                  className="premium-input"
                  value={form.groupName}
                  onChange={(e) => updateField("groupName", e.target.value)}
                  placeholder="e.g. Volume – Liter / Milliliter"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="premium-label">Primary Unit</label>
                  <input
                    className="premium-input"
                    value={form.primaryUnit}
                    onChange={(e) => updateField("primaryUnit", e.target.value)}
                    placeholder="e.g. Liter"
                    required
                  />
                </div>
                <div>
                  <label className="premium-label">Abbreviation</label>
                  <input
                    className="premium-input"
                    value={form.primaryAbbr}
                    onChange={(e) => updateField("primaryAbbr", e.target.value.toUpperCase())}
                    placeholder="e.g. L"
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="premium-label">Secondary Unit</label>
                  <input
                    className="premium-input"
                    value={form.secondaryUnit}
                    onChange={(e) => updateField("secondaryUnit", e.target.value)}
                    placeholder="e.g. Milliliter"
                    required
                  />
                </div>
                <div>
                  <label className="premium-label">Abbreviation</label>
                  <input
                    className="premium-input"
                    value={form.secondaryAbbr}
                    onChange={(e) => updateField("secondaryAbbr", e.target.value.toUpperCase())}
                    placeholder="e.g. ML"
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="premium-label">Conversion Ratio</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-navy-600">
                    1 {form.primaryAbbr || "—"}
                  </span>
                  <span className="text-slate-400">=</span>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    className="premium-input flex-1"
                    value={form.conversionRatio}
                    onChange={(e) => updateField("conversionRatio", e.target.value)}
                    placeholder="e.g. 1000"
                    required
                  />
                  <span className="text-sm font-semibold text-navy-600">
                    {form.secondaryAbbr || "—"}
                  </span>
                </div>
              </div>

              {form.primaryAbbr && form.secondaryAbbr && form.conversionRatio ? (
                <div className="flex items-center gap-2 rounded-2xl bg-navy-50/50 p-4 text-xs font-semibold text-navy-600">
                  <ArrowLeftRight size={14} />
                  <span>
                    1 {form.primaryAbbr} = {form.conversionRatio} {form.secondaryAbbr}
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    1 {form.secondaryAbbr} = {(1 / Number(form.conversionRatio)).toFixed(6).replace(/\.?0+$/, "")} {form.primaryAbbr}
                  </span>
                </div>
              ) : null}

              <button type="submit" className="btn-premium-primary w-full">
                {editingId ? "Update Unit Group" : "Create Unit Group"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
