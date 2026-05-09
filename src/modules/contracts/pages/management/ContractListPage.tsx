import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, FileText, Trash2, Edit, ChevronDown, ChevronRight, Users, FilePlus, X, Save, FileText as FileTextIcon, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContractModuleLayout from '../../components/ContractModuleLayout';
import { Contract, ContractStatus, ContractGroup } from '../../types';
import { fetchContracts } from '../../../../services/mockApi';

// Mock Contract Groups
const INITIAL_GROUPS: ContractGroup[] = [
  {
    id: 'g1',
    name: 'Senior Hair Stylists',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
  },
  {
    id: 'g2',
    name: 'Interns - Batch 2024',
    startDate: '2024-06-01',
    endDate: '2024-12-31',
  }
];

const ContractListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [groups, setGroups] = useState<ContractGroup[]>(INITIAL_GROUPS);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['g1']));
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState<Partial<ContractGroup>>({ name: '', startDate: '', endDate: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const data = await fetchContracts();
        setContracts(data);
      } catch (error) {
        console.error('Failed to load contracts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadContracts();
  }, []);

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ContractStatus.DRAFT: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ContractStatus.EXPIRED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getContractsForGroup = (groupId: string) => {
    return contracts.filter(c => c.groupId === groupId);
  };

  const handleCreateGroup = () => {
    if (!newGroup.name || !newGroup.startDate) {
      alert('Please fill in contract name and start date');
      return;
    }
    const group: ContractGroup = {
      id: `g${Date.now()}`,
      name: newGroup.name,
      startDate: newGroup.startDate,
      endDate: newGroup.endDate || undefined,
    };
    setGroups([...groups, group]);
    setNewGroup({ name: '', startDate: '', endDate: '' });
    setShowGroupModal(false);
  };

  return (
    <ContractModuleLayout>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Contract Groups', value: groups.length.toString(), color: 'indigo' },
            { label: 'Total Contracts', value: contracts.length.toString(), color: 'blue' },
            { label: 'Active', value: contracts.filter(c => c.status === ContractStatus.ACTIVE).length.toString(), color: 'emerald' },
            { label: 'Expiring Soon', value: contracts.filter(c => c.endDate && new Date(c.endDate) < new Date('2026-06-01')).length.toString(), color: 'rose' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{isLoading ? '-' : stat.value}</p>
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
              Filters
            </button>
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Group
            </button>
          </div>
        </div>

        {/* Hierarchical Contract Groups & Contracts Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left truncate">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase w-1/3">Contract Group / Contract</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Employee / Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Validity</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Version</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading contract groups...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No contract groups found
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <React.Fragment key={group.id}>
                    {/* Group Header Row */}
                    <tr className="bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
                      <td className="px-6 py-4" colSpan={6}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleGroup(group.id)}
                            className="p-1 hover:bg-indigo-100 rounded transition-colors"
                          >
                            {expandedGroups.has(group.id) ? (
                              <ChevronDown className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-indigo-600" />
                            )}
                          </button>
                          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-bold text-slate-900">{group.name}</p>
                              <span className="text-xs text-slate-500">{group.startDate} - {group.endDate || 'Ongoing'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-600">{getContractsForGroup(group.id).length} contracts</span>
                            <button
                              onClick={() => navigate(`/contracts/new?groupId=${group.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
                            >
                              <FilePlus className="w-3.5 h-3.5" />
                              Add Contract
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Contracts under this group */}
                    {expandedGroups.has(group.id) && (
                      getContractsForGroup(group.id).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 pl-16">
                            <p className="text-sm text-slate-400 italic">No contracts in this group</p>
                          </td>
                        </tr>
                      ) : (
                        getContractsForGroup(group.id).map((contract) => (
                          <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group border-l-4 border-l-transparent hover:border-l-indigo-300">
                            <td className="px-6 py-4 pl-16">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{contract.code}</p>
                                  <p className="text-xs text-slate-500">{contract.typeName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-900 font-medium">{contract.employeeName}</p>
                              <p className="text-xs text-slate-500">{contract.typeName}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-700 tracking-tight">{contract.startDate} - {contract.endDate || 'Ongoing'}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                v{contract.currentVersion}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(contract.status)}`}>
                                {contract.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1 transition-opacity">
                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
          
          {/* Summary Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">{groups.length} groups • {contracts.length} contracts</p>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md opacity-50">Previous</button>
              <button disabled className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Contract Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Contract Group</h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileTextIcon className="w-4 h-4" />
                  Contract Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Hair Stylists"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={newGroup.startDate}
                    onChange={(e) => setNewGroup({ ...newGroup, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={newGroup.endDate}
                    onChange={(e) => setNewGroup({ ...newGroup, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowGroupModal(false)}
                className="flex-1 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="flex-1 py-3.5 px-6 flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                <Save className="w-4 h-4" />
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </ContractModuleLayout>
  );
};

export default ContractListPage;
