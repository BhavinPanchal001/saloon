import React, { useState } from 'react';
import { Search, Filter, Plus, Users, LayoutGrid, CheckCircle2, ChevronRight, MoreVertical } from 'lucide-react';
import ContractModuleLayout from '../../components/ContractModuleLayout';

// Mock Groups
const MOCK_GROUPS = [
  {
    id: 'g1',
    name: 'Senior Hair Stylists',
    code: 'GRP-SNR-HS',
    category: 'Technical',
    memberCount: 15,
    contractCount: 3,
    status: 'active',
    lastUpdated: '2024-04-10'
  },
  {
    id: 'g2',
    name: 'Interns - Batch 2024',
    code: 'GRP-INT-24',
    category: 'Onboarding',
    memberCount: 8,
    contractCount: 8,
    status: 'active',
    lastUpdated: '2024-04-12'
  }
];

const GroupListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  return (
    <ContractModuleLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Contract Groups</h2>
            <p className="text-sm text-slate-500">Manage collective contract templates and employee clusters.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95">
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-3 rounded-2xl border border-slate-200">
           <div className="relative flex-1 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Search groups by name or code..." 
               className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
             />
           </div>
           <div className="flex items-center gap-2 px-1">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
                 >
                   <LayoutGrid className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => setViewMode('table')}
                   className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
                 >
                   <Users className="w-4 h-4" />
                 </button>
              </div>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                 <Filter className="w-4 h-4" />
                 Filters
              </button>
           </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_GROUPS.map((group) => (
              <div key={group.id} className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{group.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase tracking-tighter">{group.code}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs text-slate-500 font-medium">{group.category}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
                    <p className="text-sm font-bold text-slate-900">{group.memberCount} Employees</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contract Versions</p>
                    <p className="text-sm font-bold text-slate-900">{group.contractCount} Managed</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">{group.status}</span>
                   </div>
                   <button className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:gap-2 transition-all">
                      View Details
                      <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}

            {/* Empty State / Add Card */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer">
               <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-slate-400" />
               </div>
               <p className="font-bold text-slate-900">Add New Group</p>
               <p className="text-xs text-slate-500 mt-1 max-w-[160px]">Cluster employees for bulk contract matching.</p>
            </div>
          </div>
        )}
      </div>
    </ContractModuleLayout>
  );
};

export default GroupListPage;
