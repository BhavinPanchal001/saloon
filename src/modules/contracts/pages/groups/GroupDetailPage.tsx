import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Plus, Search, Trash2, UserPlus, 
  Settings, Shield, Calendar, Mail, Phone, Briefcase 
} from 'lucide-react';
import ContractModuleLayout from '../../components/ContractModuleLayout';

// Mock Employees
const ALL_EMPLOYEES = [
  { id: 'e1', name: 'John Doe', role: 'Senior Stylist', email: 'john@example.com', phone: '+1 234 567 890' },
  { id: 'e2', name: 'Jane Smith', role: 'Hair Specialist', email: 'jane@example.com', phone: '+1 234 567 891' },
  { id: 'e3', name: 'Mike Ross', role: 'Junior Stylist', email: 'mike@example.com', phone: '+1 234 567 892' },
  { id: 'e4', name: 'Sarah Connor', role: 'Manager', email: 'sarah@example.com', phone: '+1 234 567 893' },
];

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState(ALL_EMPLOYEES.slice(0, 2));
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  const handleAddMember = (employee: any) => {
    if (!members.find(m => m.id === employee.id)) {
      setMembers([...members, employee]);
    }
  };

  return (
    <ContractModuleLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/contracts/groups')}
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Senior Hair Stylists</h1>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                  GRP-SNR-HS
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Cluster Management • 15 Total Members</p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm shadow-sm">
                <Settings className="w-4 h-4" />
                Group Settings
             </button>
             <button 
               onClick={() => setShowAddMember(true)}
               className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-100 active:scale-95"
             >
                <UserPlus className="w-4 h-4" />
                Add Members
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Sidebar Stats */}
           <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm border-b-4 border-b-indigo-500">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Quick Insights</h3>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Shield className="w-4 h-4" /></div>
                          <span className="text-sm font-semibold text-slate-700">Policy Coverage</span>
                       </div>
                       <span className="text-sm font-bold text-emerald-600 leading-none">94%</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Calendar className="w-4 h-4" /></div>
                          <span className="text-sm font-semibold text-slate-700">Active Contracts</span>
                       </div>
                       <span className="text-sm font-bold text-slate-900 leading-none">12</span>
                    </div>
                 </div>
              </div>

              <div className="bg-indigo-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.2em] mb-4">Associated Contract</h3>
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                          <Briefcase className="w-6 h-6 text-white/70" />
                       </div>
                       <div>
                          <p className="text-sm font-bold">Senior Stylist Agreement</p>
                          <p className="text-[10px] text-white/40 uppercase font-black">v2.4 (Latest)</p>
                       </div>
                    </div>
                    <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/5">
                       View Template Details
                    </button>
                 </div>
                 <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
              </div>
           </div>

           {/* Member List Section */}
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                 <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-extrabold text-slate-900">Group Members</h3>
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="Search member..." 
                         className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none" 
                       />
                    </div>
                 </div>

                 <div className="flex-1">
                    <table className="w-full text-left">
                       <thead className="border-b border-slate-50 bg-slate-50/20">
                          <tr>
                             <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                             <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Info</th>
                             <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {members.map(member => (
                             <tr key={member.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                         {member.name.charAt(0)}
                                      </div>
                                      <div>
                                         <p className="text-sm font-bold text-slate-900">{member.name}</p>
                                         <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tighter">{member.role}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-5">
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                         <Mail className="w-3 h-3 text-slate-300" />
                                         {member.email}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                         <Phone className="w-3 h-3 text-slate-300" />
                                         {member.phone}
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                   <button 
                                     onClick={() => handleRemoveMember(member.id)}
                                     className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                    
                    {members.length === 0 && (
                       <div className="flex flex-col items-center justify-center p-20 text-center">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                             <Users className="w-10 h-10 text-slate-300" />
                          </div>
                          <h4 className="font-bold text-slate-900 mb-1">No Members Added</h4>
                          <p className="text-sm text-slate-500 max-w-xs">Start by adding employees to this cluster for bulk management.</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAddMember(false)} />
           <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Manage Group Members</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Select employees to add to this cluster.</p>
                 </div>
                 <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                 </button>
              </div>

              <div className="p-6">
                 <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search employees by name, role, or id..." 
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" 
                    />
                 </div>

                 <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                    {ALL_EMPLOYEES.map(emp => {
                       const isMember = members.find(m => m.id === emp.id);
                       return (
                          <div key={emp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                   {emp.name.charAt(0)}
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                                   <p className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">{emp.role}</p>
                                </div>
                             </div>
                             {isMember ? (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">ALREADY IN GROUP</span>
                             ) : (
                                <button 
                                  onClick={() => handleAddMember(emp)}
                                  className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all"
                                >
                                   <Plus className="w-4 h-4" />
                                </button>
                             )}
                          </div>
                       );
                    })}
                 </div>

                 <button 
                   onClick={() => setShowAddMember(false)}
                   className="w-full mt-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 shadow-indigo-100"
                 >
                    Finish Adding
                 </button>
              </div>
           </div>
        </div>
      )}
    </ContractModuleLayout>
  );
};

export default GroupDetailPage;
