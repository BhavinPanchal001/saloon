import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Layers, FileText, DollarSign, Calendar, Clock, Heart, 
  Search, Plus, Edit, Trash2, Check, ArrowLeft 
} from 'lucide-react';
import ContractModuleLayout from '../../components/ContractModuleLayout';
import MasterFormModal from '../../components/masters/MasterFormModal';
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal';

const MASTER_CONFIG = {
  types: { name: 'Contract Types', icon: Layers, desc: 'Full-time, Part-time, Internship, etc.', color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600' },
  templates: { name: 'Templates', icon: FileText, desc: 'Legal letterhead and clause sets.', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-600' },
  salary: { name: 'Salary Components', icon: DollarSign, desc: 'Basic, HRA, PF, Professional Tax.', color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  holidays: { name: 'Holidays', icon: Calendar, desc: 'Public holidays and leave groups.', color: 'amber', bg: 'bg-amber-100', text: 'text-amber-600' },
  leaves: { name: 'Leave Policy', icon: Heart, desc: 'Accrual rates and carry-forward rules.', color: 'rose', bg: 'bg-rose-100', text: 'text-rose-600' },
  shifts: { name: 'Shift Master', icon: Clock, desc: 'Standard operating hours & patterns.', color: 'violet', bg: 'bg-violet-100', text: 'text-violet-600' },
};

const MasterCRUDPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  
  const config = useMemo(() => {
    return (MASTER_CONFIG as any)[type || ''] || MASTER_CONFIG.types;
  }, [type]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    console.log('Deleting item:', itemToDelete);
    setIsDeleteOpen(false);
  };

  const handleSave = (data: any) => {
    console.log('Saving master data:', data);
    setIsModalOpen(false);
  };

  return (
    <ContractModuleLayout>
      <div className="space-y-6">
        {/* Breadcrumbs / Back */}
        <button 
          onClick={() => navigate('/contracts/masters')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all group"
        >
          <div className="p-1.5 rounded-lg group-hover:bg-indigo-50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm">Back to Masters</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          {/* Dynamic Header */}
          <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${config.bg} ${config.text}`}>
                <config.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">{config.name}</h3>
                <p className="text-sm text-slate-500 font-medium">{config.desc}</p>
              </div>
            </div>
            <button 
              onClick={handleAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add New {config.name.replace('Master', '').replace('Policy', '').replace('s', '')}
            </button>
          </div>

          {/* Search & Utility */}
          <div className="p-4 border-b border-slate-50 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder={`Search ${config.name.toLowerCase()}...`} className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-slate-300 transition-all outline-none" />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-left">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <tr>
                  <th className="px-4 py-3">Name / Label</th>
                  <th className="px-4 py-3">Code / ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-slate-800 tracking-tight">Standard {config.name.replace('Master', '')} {item}</p>
                      <p className="text-[11px] text-slate-400 font-medium">Default system {type} record</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded tracking-tighter">MSTR-{type?.toUpperCase()}-{item}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 w-fit">
                        <Check className="w-3 h-3" />
                        <span className="text-[10px] font-extrabold uppercase truncate">Active</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit({ id: item, name: 'Sample' })}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick({ id: item, name: `Master ${type} ${item}` })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MasterFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        masterType={type || ''}
        initialData={editingItem}
        onSave={handleSave}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.name}
      />
    </ContractModuleLayout>
  );
};

export default MasterCRUDPage;
