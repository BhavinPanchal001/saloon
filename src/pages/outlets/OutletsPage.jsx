import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Plus } from "lucide-react";
import { fetchOutlets } from "../../services/mockApi";
import { formatCurrency } from "../../utils/format";
import { OutletFormModal } from "./OutletFormModal";

export function OutletsPage() {
  const [outlets, setOutlets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutletId, setEditingOutletId] = useState(null);
  const navigate = useNavigate();

  const loadOutlets = () => {
    fetchOutlets().then(setOutlets);
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

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Outlet Name</th>
              <th>City</th>
              <th>Branch Manager</th>
              <th>Operating Budget</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {outlets.map((outlet) => (
              <tr key={outlet.id}>
                <td className="font-bold text-navy-900">{outlet.name}</td>
                <td className="text-slate-600">{outlet.city}</td>
                <td>
                  <span className="font-bold text-navy-600">{outlet.manager}</span>
                </td>
                <td className="font-bold text-navy-900">{formatCurrency(outlet.monthlyBudget)}</td>
                <td>
                  <button
                    onClick={() => handleEditClick(outlet.id)}
                    className="text-xs font-bold uppercase tracking-wider text-navy-400 hover:text-gold-600"
                  >
                    Edit
                  </button>
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
