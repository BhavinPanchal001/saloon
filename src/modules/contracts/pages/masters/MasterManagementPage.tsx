import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, FileText, DollarSign, Calendar, Clock, Heart, Plus } from 'lucide-react';
import ContractModuleLayout from '../../components/ContractModuleLayout';

const MASTER_TYPES = [
  { id: 'types', name: 'Contract Types', icon: Layers, desc: 'Full-time, Part-time, Internship, etc.', color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600', activeBg: 'group-hover:bg-indigo-600' },
  { id: 'templates', name: 'Templates', icon: FileText, desc: 'Legal letterhead and clause sets.', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', activeBg: 'group-hover:bg-blue-600' },
  { id: 'salary', name: 'Salary Components', icon: DollarSign, desc: 'Basic, HRA, PF, Professional Tax.', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', activeBg: 'group-hover:bg-emerald-600' },
  { id: 'holidays', name: 'Holidays', icon: Calendar, desc: 'Public holidays and leave groups.', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', activeBg: 'group-hover:bg-amber-600' },
  { id: 'leaves', name: 'Leave Policy', icon: Heart, desc: 'Accrual rates and carry-forward rules.', color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600', activeBg: 'group-hover:bg-rose-600' },
  { id: 'shifts', name: 'Shift Master', icon: Clock, desc: 'Standard operating hours & patterns.', color: 'violet', bg: 'bg-violet-50', text: 'text-violet-600', activeBg: 'group-hover:bg-violet-600' },
];

const MasterManagementPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ContractModuleLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Master Data Management</h2>
          <p className="text-slate-500 font-medium">Configure global settings and master records for the contract system.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MASTER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => navigate(`/contracts/masters/${type.id}`)}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-left flex flex-col gap-4 active:scale-[0.98]"
            >
              <div className={`w-14 h-14 rounded-2xl ${type.bg} ${type.text} flex items-center justify-center ${type.activeBg} group-hover:text-white transition-all`}>
                <type.icon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{type.name}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{type.desc}</p>
              </div>
              <div className="mt-auto pt-4 flex items-center text-xs font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                Manage Records
                <Plus className="w-3 h-3 ml-2" />
              </div>
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4 text-center md:text-left">
                 <h3 className="text-2xl font-bold">About Master Data</h3>
                 <p className="text-indigo-100 text-sm leading-relaxed max-w-2xl font-medium">
                    Master data provides the base configuration for all contracts in the system. Changes made here will be available across the entire contract creation and management flow. Ensure accuracy when defining salary components and leave policies.
                 </p>
              </div>
              <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                 <Layers className="w-12 h-12 text-white/40" />
              </div>
           </div>
           
           {/* Decorative elements */}
           <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
           <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
      </div>
    </ContractModuleLayout>
  );
};

export default MasterManagementPage;
