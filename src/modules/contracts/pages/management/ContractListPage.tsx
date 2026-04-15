import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, FileText, History, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContractModuleLayout from '../../components/ContractModuleLayout';
import { ContractStatus } from '../../types';

// Mock Data
const MOCK_CONTRACTS = [
  {
    id: '1',
    code: 'CON-2024-001',
    employeeName: 'Sarah Jenkins',
    groupName: 'Senior Stylists',
    typeName: 'Full-time',
    status: ContractStatus.ACTIVE,
    startDate: '2024-01-01',
    endDate: '2025-01-01',
    version: 2
  },
  {
    id: '2',
    code: 'CON-2024-002',
    employeeName: 'James Wilson',
    groupName: 'Junior Stylists',
    typeName: 'Probation',
    status: ContractStatus.DRAFT,
    startDate: '2024-03-15',
    endDate: '2024-06-15',
    version: 1
  }
];

const ContractListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ContractStatus.DRAFT: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ContractStatus.EXPIRED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <ContractModuleLayout>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Contracts', value: '124', color: 'indigo' },
            { label: 'Active', value: '98', color: 'emerald' },
            { label: 'Pending Revision', value: '12', color: 'amber' },
            { label: 'Expiring Soon', value: '5', color: 'rose' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, employee, or group..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
              Advanced Filters
            </button>
            <button 
              onClick={() => navigate('/contracts/new')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Contract
            </button>
          </div>
        </div>

        {/* Contracts Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left truncate">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contract Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Employee / Group</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Validity</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Version</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_CONTRACTS.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{contract.code}</p>
                        <p className="text-xs text-slate-500">{contract.typeName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900 font-medium">{contract.employeeName}</p>
                    <p className="text-xs text-slate-500">{contract.groupName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700 tracking-tight">{contract.startDate} - {contract.endDate}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      v{contract.version}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(contract.status)}`}>
                      {contract.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="History">
                        <History className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing 1 to 2 of 2 contracts</p>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md opacity-50">Previous</button>
              <button disabled className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </ContractModuleLayout>
  );
};

export default ContractListPage;
