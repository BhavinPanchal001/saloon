import React, { useEffect, useState, useMemo } from 'react';
import { 
  Tags, Search, Plus, Edit, Trash2, Check, X
} from 'lucide-react';
import {
  fetchServiceCategoriesFromAPI,
  createServiceCategoryAPI,
  updateServiceCategoryAPI,
  deleteServiceCategoryAPI,
} from '../../../services/api';
import DeleteConfirmationModal from '../../contracts/components/common/DeleteConfirmationModal';
import '../styles/services.css';

const ServiceCategoryMasterPage: React.FC = () => {
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
      const data = await fetchServiceCategoriesFromAPI();
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
      await deleteServiceCategoryAPI(itemToDelete.id);
      loadCategories();
    }
    setIsDeleteOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateServiceCategoryAPI(editingItem.id, form);
    } else {
      await createServiceCategoryAPI(form);
    }
    setIsModalOpen(false);
    loadCategories();
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter(c => c.status === 'active').length;
    const inactive = categories.filter(c => c.status === 'inactive').length;
    return { total, active, inactive };
  }, [categories]);

  return (
    <div className="service-module">
      {/* Header Area */}
      <header className="module-header">
        <div className="module-title">
          <h1>Service Category Master</h1>
          <p>Manage global classification for all your salon services.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="btn-premium"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </header>

      {/* Stats Summary Panel */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Total Categories</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Active</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.active}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Inactive</div>
          <div className="text-2xl font-bold mt-1 text-slate-500">{stats.inactive}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input 
            type="text" 
            placeholder="Search by name or code..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="service-table-container">
          <table className="service-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Internal Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-navy-400">
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Tags size={64} />
                      <p className="text-lg font-bold">No categories found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center font-bold text-gold-700 text-sm">
                          {cat.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-navy-900">{cat.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-lg">
                        {cat.code}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${cat.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {cat.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(cat)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl border border-navy-100 bg-white/50 text-navy-600 hover:bg-navy-50 hover:text-navy-900 transition-all"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(cat)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50/30 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-4 py-3 flex justify-between items-center border-t border-navy-100">
          <div className="text-sm text-navy-500">
            Showing {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
          </div>
          <div className="flex gap-2">
            <button className="btn-premium-outline !py-2 !px-4" disabled>Previous</button>
            <button className="btn-premium-outline !py-2 !px-4">Next</button>
          </div>
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
