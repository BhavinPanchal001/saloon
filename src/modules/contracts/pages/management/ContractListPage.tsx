import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, FileText, Trash2, Edit, ChevronDown, ChevronRight, Users, FilePlus, X, Save, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContractModuleLayout from '../../components/ContractModuleLayout';
import { Contract, ContractStatus, ContractGroup } from '../../types';
import { fetchContracts, fetchContractGroups, saveContractGroup, fetchStaff } from '../../../../services/api';

const ContractListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [groups, setGroups] = useState<ContractGroup[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<'group' | 'employee'>('group');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState<Partial<ContractGroup>>({ name: '', startDate: '', endDate: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [contractsData, groupsData, staffData] = await Promise.all([
          fetchContracts(),
          fetchContractGroups(),
          fetchStaff()
        ]);
        setContracts(contractsData);
        setGroups(groupsData);
        setStaff(staffData);
        if (groupsData.length > 0) {
          setExpandedGroups(new Set([groupsData[0].id]));
        }
      } catch (error) {
        console.error('Failed to load contract lists:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ContractStatus.DRAFT: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ContractStatus.TERMINATED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getContractsForGroup = (groupId: string) => {
    return contracts.filter(c => {
      const matchesGroup = c.groupId === groupId;
      const matchesSearch = searchTerm ? (
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.typeName || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;
      return matchesGroup && matchesSearch;
    });
  };

  const getContractsForEmployee = (employeeId: string) => {
    return contracts.filter(c => {
      const matchesEmployee = c.employeeId === employeeId;
      const matchesSearch = searchTerm ? (
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.typeName || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;
      return matchesEmployee && matchesSearch;
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.startDate) {
      alert('Please fill in contract name and start date');
      return;
    }
    try {
      const savedGroup = await saveContractGroup({
        name: newGroup.name,
        startDate: newGroup.startDate,
        endDate: newGroup.endDate || undefined,
        duration: "12 Months", // Default duration estimate
        employeeId: newGroup.employeeId || undefined
      });
      setGroups(prev => [...prev, savedGroup]);
      setNewGroup({ name: '', startDate: '', endDate: '', employeeId: '' });
      setShowGroupModal(false);
    } catch (err) {
      console.error('Failed to save group:', err);
    }
  };

  // Filter groups if search is active
  const displayedGroups = groups.filter(group => {
    if (!searchTerm) return true;
    const groupNameMatch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const contractsInGroup = getContractsForGroup(group.id);
    return groupNameMatch || contractsInGroup.length > 0;
  });

  // Filter staff if search is active or they have contracts
  const displayedStaff = staff.filter(emp => {
    const contractsForEmp = getContractsForEmployee(emp.id);
    if (!searchTerm) {
      // In employee view, let's show employees who have contracts
      return contractsForEmp.length > 0;
    }
    const nameMatch = (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const codeMatch = (emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = (emp.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || codeMatch || roleMatch || contractsForEmp.length > 0;
  });

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
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={groupBy === 'group' ? "Search by code, employee, or group..." : "Search employee or contract code..."}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Toggle group-wise vs employee-wise */}
            <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
              <button
                onClick={() => { setGroupBy('group'); setExpandedGroups(new Set(groups.length > 0 ? [groups[0].id] : [])); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  groupBy === 'group' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Group-wise
              </button>
              <button
                onClick={() => { setGroupBy('employee'); setExpandedGroups(new Set(staff.length > 0 ? [staff[0].id] : [])); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  groupBy === 'employee' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Employee-wise
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Group
            </button>
          </div>
        </div>

        {/* Hierarchical Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left truncate">
            <thead className="bg-slate-50 border-b border-slate-200">
              {groupBy === 'group' ? (
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase w-1/3">Contract Group / Contract</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Employee / Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Validity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Version</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase w-1/3">Employee Name / Contract Code</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contract Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Validity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Version</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading contract data...
                  </td>
                </tr>
              ) : groupBy === 'group' ? (
                /* ── Group-wise rendering ── */
                displayedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No contract groups found
                    </td>
                  </tr>
                ) : (
                  displayedGroups.map((group) => (
                    <React.Fragment key={group.id}>
                      {/* Group Header Row */}
                      <tr className="bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
                        <td className="px-6 py-4" colSpan={6}>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleGroup(group.id)}
                              className="p-1 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
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
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors cursor-pointer"
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
                )
              ) : (
                /* ── Employee-wise rendering ── */
                displayedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No employees with contract records found
                    </td>
                  </tr>
                ) : (
                  displayedStaff.map((employee) => (
                    <React.Fragment key={employee.id}>
                      {/* Employee Row */}
                      <tr className="bg-emerald-50/20 hover:bg-emerald-50/50 transition-colors">
                        <td className="px-6 py-4" colSpan={6}>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleGroup(employee.id)}
                              className="p-1 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                            >
                              {expandedGroups.has(employee.id) ? (
                                <ChevronDown className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-emerald-600" />
                              )}
                            </button>
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                                <p className="text-sm font-bold text-slate-900">{employee.name}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                  {employee.employeeCode || 'NO-CODE'}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  {employee.role || 'Unspecified Role'} • {employee.outletId ? employee.outletId.replace('outlet_', '').toUpperCase() : 'No Outlet'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-600">{getContractsForEmployee(employee.id).length} contracts</span>
                              <button
                                onClick={() => navigate(`/contracts/new?employeeId=${employee.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <FilePlus className="w-3.5 h-3.5" />
                                Add Contract
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Nested Contracts for this employee */}
                      {expandedGroups.has(employee.id) && (
                        getContractsForEmployee(employee.id).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 pl-16">
                              <p className="text-sm text-slate-400 italic">No contracts assigned to this employee</p>
                            </td>
                          </tr>
                        ) : (
                          getContractsForEmployee(employee.id).map((contract) => (
                            <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group border-l-4 border-l-transparent hover:border-l-emerald-300">
                              <td className="px-6 py-4 pl-16">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{contract.code}</p>
                                    <p className="text-xs text-slate-400 font-medium">Group: {groups.find(g => g.id === contract.groupId)?.name || 'Direct / No Group'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-900 font-medium">{contract.typeName}</p>
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
                )
              )}
            </tbody>
          </table>
          
          {/* Summary Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {groupBy === 'group' ? `${groups.length} groups` : `${staff.length} employees`} • {contracts.length} contracts
            </p>
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
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Employee Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  Select Employee (Optional)
                </label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer text-sm"
                  value={newGroup.employeeId || ''}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const selectedEmp = staff.find(s => s.id === empId);
                    setNewGroup({
                      ...newGroup,
                      employeeId: empId,
                      name: selectedEmp ? `${selectedEmp.name}'s Contract Group` : (newGroup.name || '')
                    });
                  }}
                >
                  <option value="">Choose an Employee...</option>
                  {staff.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Contract Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Hair Stylists"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  required
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
                className="flex-1 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="flex-1 py-3.5 px-6 flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all cursor-pointer"
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
