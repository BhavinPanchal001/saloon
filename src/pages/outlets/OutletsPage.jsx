import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Plus, ArrowUpRight } from "lucide-react";
import { fetchOutletsFromAPI } from "../../services/api";
import { OutletFormModal } from "./OutletFormModal";

export function OutletsPage() {
  const [outlets, setOutlets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutletId, setEditingOutletId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const loadOutlets = () => {
    setLoadError(null);
    fetchOutletsFromAPI()
      .then(setOutlets)
      .catch(() => setLoadError('Failed to load outlets. Please try again.'));
  };

  useEffect(() => {
    loadOutlets();
  }, []);

  const handleAddClick = () => {
    setEditingOutletId(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (id) => {
    setEditingOutletId(id);
    setIsModalOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Outlets"
        description="A placeholder management view for branch-level settings, ownership, and budget context."
        action={
          <button
            onClick={handleAddClick}
            className="btn-premium-primary"
          >
            <Plus size={18} />
            Add Outlet
          </button>
        }
      />

      {loadError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {loadError}
        </div>
      )}

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Outlet Name</th>
              <th>Code</th>
              <th>City</th>
              <th>Branch Manager</th>
              <th>Status</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {outlets.map((outlet) => (
              <tr key={outlet.id}>
                <td className="font-bold text-navy-900">{outlet.name}</td>
                <td>
                  <span className="status-badge bg-navy-50 text-navy-600">{outlet.code || "N/A"}</span>
                </td>
                <td className="text-slate-600">{outlet.city}</td>
                <td>
                  <span className="font-bold text-navy-600">{outlet.manager || '—'}</span>
                </td>
                <td>
                  <span className={`status-badge ${outlet.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                    {outlet.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/budgets?outletId=${outlet.id}`}
                      className="text-xs font-bold uppercase tracking-wider text-navy-400 hover:text-gold-600 flex items-center gap-1"
                    >
                      Show More
                      <ArrowUpRight size={12} />
                    </Link>
                    <button
                      onClick={() => handleEditClick(outlet.id)}
                      className="text-xs font-bold uppercase tracking-wider text-navy-400 hover:text-gold-600"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OutletFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        outletId={editingOutletId}
        onSave={loadOutlets}
      />
    </div>
  );
}
