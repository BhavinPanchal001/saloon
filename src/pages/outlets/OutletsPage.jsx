import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Plus, ArrowUpRight } from "lucide-react";
import { fetchOutletsFromAPI } from "../../services/api";
import { OutletFormModal } from "./OutletFormModal";
import { AuditHistoryButton, AuditHistoryModal } from "../../components/audit";

export function OutletsPage() {
  const [outlets, setOutlets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutletId, setEditingOutletId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  
  // Audit history state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditEntity, setAuditEntity] = useState({ type: null, id: null, name: null });

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

  const openAuditHistory = (entityType, entityId, entityName) => {
    setAuditEntity({ type: entityType, id: entityId, name: entityName });
    setAuditModalOpen(true);
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
              <th>History</th>
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
                  <AuditHistoryButton
                    onClick={() => openAuditHistory('outlet_inventory', outlet.id, outlet.name)}
                    size="sm"
                    variant="ghost"
                    showText={false}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/outlets/transactions?outletId=${outlet.id}`}
                      className="text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                    >
                      Transactions
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
      
      {/* Audit History Modal */}
      <AuditHistoryModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        entityType={auditEntity.type}
        entityId={auditEntity.id}
        entityName={auditEntity.name}
      />
    </div>
  );
}
