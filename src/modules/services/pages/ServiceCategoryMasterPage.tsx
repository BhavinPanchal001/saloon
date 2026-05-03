import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Tags, Search, Plus, Edit, Trash2, Check, ArrowLeft, X 
} from 'lucide-react';
import { fetchServiceCategories, saveServiceCategory, deleteServiceCategory } from '../../../services/mockApi';
import DeleteConfirmationModal from '../../contracts/components/common/DeleteConfirmationModal';

const ServiceCategoryMasterPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
  // Form State
  const [form, setForm] = useState({ name: '', code: '', status: 'active' });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchServiceCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    setForm({ name: '', code: '', status: 'active' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setForm({ name: item.name, code: item.code, status: item.status });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteServiceCategory(itemToDelete.id);
      loadCategories();
    }
    setIsDeleteOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveServiceCategory({
      ...form,
      id: editingItem?.id
    });
    setIsModalOpen(false);
    loadCategories();
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button 
            onClick={() => navigate('/services')}
            className="flex items-center gap-2 text-slate-500 hover:text-gold-600 font-bold mb-2 transition-all group"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Services</span>
          </button>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Service Category Master</h2>
          <p className="text-slate-500 font-medium mt-1">Manage global classification for all your salon services.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 bg-navy-900 text-white font-bold rounded-2xl hover:bg-navy-800 transition-all shadow-xl shadow-navy-900/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Search Bar */}
        <div className="p-6 border-b border-slate-100 flex gap-4 bg-slate-50/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or code..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-left">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Internal Code</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-medium">
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Tags size={64} />
                      <p className="text-lg font-bold">No categories found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-600 flex items-center justify-center font-black text-xs">
                          {cat.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-lg">
                        {cat.code}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border w-fit ${
                        cat.status === 'active' 
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                          : 'text-slate-400 bg-slate-50 border-slate-100'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cat.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-black uppercase">{cat.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(cat)}
                          className="p-2.5 text-slate-400 hover:text-gold-600 hover:bg-gold-50 rounded-xl transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(cat)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-extrabold text-slate-900">
                {editingItem ? 'Edit Category' : 'New Service Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Category Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gold-500/20 transition-all outline-none font-bold"
                  placeholder="e.g. Hair Care"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Category Code</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gold-500/20 transition-all outline-none font-mono"
                  placeholder="e.g. HAIR"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                <div className="flex gap-4">
                  {['active', 'inactive'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setForm({ ...form, status })}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        form.status === status 
                          ? 'bg-navy-900 text-white shadow-lg shadow-navy-900/20' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-gold-500 text-navy-900 text-sm font-black rounded-2xl hover:bg-gold-600 transition-all shadow-xl shadow-gold-500/20 active:scale-95"
                >
                  {editingItem ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.name}
      />
    </div>
  );
};

export default ServiceCategoryMasterPage;
