import React, { useState } from 'react';
import { Save, X, ChevronRight, User, Briefcase, DollarSign, Calendar, Clock, RotateCcw, Edit, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'mapping', label: 'Mapping', icon: Briefcase },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'policies', label: 'Policies', icon: Calendar },
  { id: 'shift', label: 'Shift & Hours', icon: Clock },
  { id: 'revision', label: 'Revision Info', icon: RotateCcw },
];

const ContractFormPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Form Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Create New Contract</h1>
              <p className="text-sm text-slate-500">Drafting version 1.0 of the agreement.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Save as Draft
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95">
              <Save className="w-4 h-4" />
              Finalize Contract
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-8 p-8">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl border-2 transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' 
                  : 'bg-transparent border-transparent text-slate-500 hover:bg-white hover:text-slate-900'}
              `}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Form Content Area */}
        <div className="flex-1 space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[600px]">
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-1">General Information</h2>
                <p className="text-sm text-slate-500 mb-6">Enter the primary details for this contract.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Contract Title *</label>
                    <input type="text" placeholder="e.g. Senior Hair Stylist Agreement" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Contract Code *</label>
                    <input type="text" placeholder="CON-XXXXX" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Start Date *</label>
                    <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">End Date (Optional)</label>
                    <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </section>
              
              <section>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Contract Remarks (Internal)</label>
                <textarea rows={4} placeholder="Add any special conditions or notes here..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </section>
            </div>
          )}

          {activeTab === 'financials' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-lg font-bold text-slate-900">Salary Components</h2>
                <p className="text-sm text-slate-500">Configure earnings and deductions for this contract.</p>
                
                <div className="space-y-4">
                   {/* This would be a dynamic list in the real app */}
                   <div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <div className="flex gap-4 items-center">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 font-bold text-xs">EARNING</div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Basic Salary</p>
                          <p className="text-xs text-slate-500">Fixed Amount • Monthly</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-extrabold text-slate-900">$4,500.00</span>
                        <button className="text-slate-400 hover:text-slate-900"><Edit className="w-4 h-4" /></button>
                      </div>
                   </div>

                   <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all font-semibold flex items-center justify-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Add Salary Component
                   </button>
                </div>

                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-600">Total Earnings</span>
                      <span className="font-bold text-slate-900">$4,500.00</span>
                   </div>
                   <div className="flex justify-between items-center mb-4 text-rose-600">
                      <span className="text-sm">Total Deductions</span>
                      <span className="font-bold">-$0.00</span>
                   </div>
                   <div className="h-px bg-slate-200 my-4" />
                   <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-slate-900">Net Payable</span>
                      <span className="text-xl font-extrabold text-indigo-600">$4,500.00</span>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'shift' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div>
                  <h2 className="text-lg font-bold text-slate-900">Shift & Working Hours</h2>
                  <p className="text-sm text-slate-500">Assign a shift pattern and define working hours for this contract.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { name: 'Standard Day Shift', time: '09:00 AM - 06:00 PM', days: 'Mon - Sat' },
                    { name: 'Evening Shift', time: '02:00 PM - 10:00 PM', days: 'Mon - Sat' },
                  ].map((shift, i) => (
                    <div key={i} className="p-4 border border-slate-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50/50 cursor-pointer transition-all group relative">
                       <div className="flex justify-between items-start mb-2">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                             <Clock className="w-4 h-4" />
                          </div>
                          <input type="radio" name="shift" className="w-4 h-4 accent-indigo-600" defaultChecked={i === 0} />
                       </div>
                       <p className="text-sm font-bold text-slate-900">{shift.name}</p>
                       <p className="text-xs text-slate-500 mt-1">{shift.time}</p>
                       <p className="text-xs font-semibold text-indigo-600 mt-2">{shift.days}</p>
                    </div>
                  ))}

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 md:col-span-2">
                     <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Shift Configuration
                     </h4>
                     <p className="text-xs text-slate-500 leading-relaxed">
                        Select a shift from the list above. Shifts are managed by administrators in the Global Masters section. If you don't see the shift you need, please contact your administrator.
                     </p>
                  </div>
               </div>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {!['basic', 'financials', 'shift'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  {React.createElement(TABS.find(t => t.id === activeTab)?.icon || Calendar, { 
                    className: "w-10 h-10 text-slate-300" 
                  })}
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">{TABS.find(t => t.id === activeTab)?.label} Configuration</h3>
               <p className="text-sm text-slate-500 max-w-sm">
                  This section uses data from the <span className="font-bold text-indigo-600">Global Masters</span> configuration. 
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractFormPage;
