import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, DollarSign, Clock, Calendar, Shield, Briefcase, FileText, BookOpen } from 'lucide-react';
import ContractModuleLayout from '../../components/ContractModuleLayout';
import MasterFormModal from '../../components/masters/MasterFormModal';
import { ComponentType, CalculationType } from '../../types';

// Master categories
const MASTER_TABS = [
  { id: 'salary', label: 'Salary Components', icon: DollarSign },
  { id: 'shifts', label: 'Shifts', icon: Clock },
  { id: 'leaves', label: 'Leave Types', icon: Calendar },
  { id: 'holidays', label: 'Holiday Groups', icon: Shield },
  { id: 'types', label: 'Contract Types', icon: Briefcase },
  { id: 'templates', label: 'Templates', icon: FileText },
];

// Mock master data
const MOCK_MASTERS: Record<string, any[]> = {
  salary: [
    { id: 's1', name: 'Basic Salary', code: 'SAL-BAS', type: 'earning', calculationType: 'fixed', defaultAmount: 3000, isActive: true },
    { id: 's2', name: 'Housing Allowance', code: 'SAL-HSG', type: 'earning', calculationType: 'percentage', defaultAmount: 500, isActive: true },
    { id: 's3', name: 'EPF Deduction', code: 'SAL-EPF', type: 'deduction', calculationType: 'percentage', defaultAmount: 11, isActive: true },
    { id: 's4', name: 'SOCSO', code: 'SAL-SOC', type: 'deduction', calculationType: 'fixed', defaultAmount: 30, isActive: true },
  ],
  shifts: [
    { id: 'sh1', name: 'Morning Shift', code: 'SH-AM', startTime: '08:00', endTime: '16:00', workingHours: 8, isActive: true },
    { id: 'sh2', name: 'Afternoon Shift', code: 'SH-PM', startTime: '12:00', endTime: '20:00', workingHours: 8, isActive: true },
    { id: 'sh3', name: 'Full Day', code: 'SH-FD', startTime: '09:00', endTime: '18:00', workingHours: 9, isActive: true },
  ],
  leaves: [
    { id: 'l1', name: 'Annual Leave', code: 'LV-ANN', defaultCount: 14, isPaid: true, isActive: true },
    { id: 'l2', name: 'Sick Leave', code: 'LV-SCK', defaultCount: 14, isPaid: true, isActive: true },
    { id: 'l3', name: 'Maternity Leave', code: 'LV-MAT', defaultCount: 60, isPaid: true, isActive: true },
    { id: 'l4', name: 'Unpaid Leave', code: 'LV-UNP', defaultCount: 0, isPaid: false, isActive: true },
  ],
  holidays: [
    { id: 'h1', name: 'National Holidays 2025', code: 'HOL-NAT', date: '2025-01-01', isRecurring: true, isActive: true },
    { id: 'h2', name: 'Company Holidays', code: 'HOL-CMP', date: '2025-03-01', isRecurring: false, isActive: true },
  ],
  types: [
    { id: 't1', name: 'Full-Time Employment', code: 'CT-FTE', description: 'Standard full-time employment contract', isActive: true },
    { id: 't2', name: 'Part-Time Employment', code: 'CT-PTE', description: 'Part-time employment contract', isActive: true },
    { id: 't3', name: 'Internship', code: 'CT-INT', description: 'Internship/training contract', isActive: true },
  ],
  templates: [
    { id: 'tp1', name: 'Standard Employment', code: 'TPL-STD', description: 'Default template for full-time staff', isActive: true },
    { id: 'tp2', name: 'Intern Template', code: 'TPL-INT', description: 'Template for internship contracts', isActive: true },
  ],
};

const ContractMastersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const currentItems = MOCK_MASTERS[activeTab] || [];
  const filteredItems = currentItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTabLabel = () => MASTER_TABS.find(t => t.id === activeTab)?.label || '';

  const renderItemDetails = (item: any) => {
    switch (activeTab) {
      case 'salary':
        return (
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
              item.type === 'earning' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {item.type === 'earning' ? 'Earning' : 'Deduction'}
            </span>
            <span className="text-xs text-slate-500 capitalize">{item.calculationType}</span>
            <span className="text-sm font-semibold text-slate-700">
              {item.calculationType === 'percentage' ? `${item.defaultAmount}%` : `RM ${item.defaultAmount}`}
            </span>
          </div>
        );
      case 'shifts':
        return (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{item.startTime} - {item.endTime}</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{item.workingHours}h</span>
          </div>
        );
      case 'leaves':
        return (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{item.defaultCount} days/year</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
              item.isPaid 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {item.isPaid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        );
      case 'holidays':
        return (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{item.date}</span>
            {item.isRecurring && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Recurring</span>
            )}
          </div>
        );
      default:
        return item.description ? (
          <p className="text-sm text-slate-500">{item.description}</p>
        ) : null;
    }
  };

  return (
    <ContractModuleLayout>
      <div className="space-y-6">
        {/* Master Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {MASTER_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Add */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${getTabLabel().toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingItem(null); setShowFormModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add {getTabLabel().replace(/s$/, '')}
          </button>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Code</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No {getTabLabel().toLowerCase()} found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {renderItemDetails(item)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        item.isActive
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setEditingItem(item); setShowFormModal(true); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
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

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">{filteredItems.length} {getTabLabel().toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* Master Form Modal */}
      <MasterFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingItem(null); }}
        masterType={activeTab}
        initialData={editingItem}
        onSave={() => { setShowFormModal(false); setEditingItem(null); }}
      />
    </ContractModuleLayout>
  );
};

export default ContractMastersPage;
