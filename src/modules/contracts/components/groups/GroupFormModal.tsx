import React from 'react';
import { X, Save, Users, Tag, List } from 'lucide-react';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSave: (data: any) => void;
}

const GroupFormModal: React.FC<GroupFormModalProps> = ({ 
  isOpen, 
  onClose, 
  initialData, 
  onSave 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {initialData ? 'Edit Group' : 'Create New Group'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Define a new cluster for contract management.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form className="p-8 space-y-5" onSubmit={(e) => { e.preventDefault(); onSave({}); }}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Users className="w-3 h-3" />
              Group Name
            </label>
            <input 
              type="text" 
              defaultValue={initialData?.name}
              placeholder="e.g. Senior Professional Stylists" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-900" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Tag className="w-3 h-3" />
                Group Code
              </label>
              <input 
                type="text" 
                defaultValue={initialData?.code}
                placeholder="GRP-XXXX" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <List className="w-3 h-3" />
                Category
              </label>
              <select 
                defaultValue={initialData?.category || 'Core'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              >
                <option value="Technical">Technical</option>
                <option value="Support">Support</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Executive">Executive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</label>
            <textarea 
              rows={3} 
              defaultValue={initialData?.description}
              placeholder="Internal notes about this employee cluster..." 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" 
            />
          </div>

          <div className="mt-8 flex gap-3">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3.5 px-6 flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupFormModal;
