import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, 
  FileText, GitBranch, Calendar, User, ChevronDown, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContractModuleLayout from '../../components/ContractModuleLayout';
import GroupFormModal from '../../components/groups/GroupFormModal';
import { Contract, ContractStatus, ContractGroup } from '../../types';
import { fetchContracts, fetchContractGroups, saveContractGroup, deleteContractGroup, fetchStaff } from '../../../../services/api';

// Fallback seed data if backend returns empty dataset
const INITIAL_DEMO_GROUPS: ContractGroup[] = [
  {
    id: 'cg_bindiya_1',
    name: 'Employment Contract 18/12/2024 to 18/12/2026',
    startDate: '2024-12-18',
    endDate: '2026-12-18',
    duration: '24 Months',
    employeeId: 'emp_bindiya',
    employeeName: 'Adv. Bindiya Patel',
    employeeCode: 'EMP001',
    status: 'Active',
    description: 'Employment contract group for Adv. Bindiya Patel'
  }
];

const INITIAL_DEMO_CONTRACTS: Contract[] = [
  {
    id: 'con_bindiya_active',
    code: 'JOB',
    title: 'Senior Hair Stylist Agreement',
    employeeId: 'emp_bindiya',
    employeeName: 'Adv. Bindiya Patel',
    groupId: 'cg_bindiya_1',
    groupName: 'Employment Contract 18/12/2024 to 18/12/2026',
    typeId: 'type_job',
    typeName: 'Job Contract',
    templateId: 'tpl_standard',
    startDate: '01/04/2026',
    endDate: '17/12/2026',
    status: ContractStatus.ACTIVE,
    currentVersion: 1,
    salaryComponents: [],
    overtime: { enabled: false, type: '1.5x', rateCalculation: 'fixed_hourly', rateValue: 150 },
    holidayRate: '1.5x',
    weekendRate: '1.5x',
    overtimeRate: '1.5x',
    holidayGroupIds: [],
    leaveAllocations: [],
    shiftId: '',
    shiftEffectiveDate: '',
    weeklyOffPattern: [],
    revisions: []
  },
  {
    id: 'con_bindiya_term',
    code: 'JOB',
    title: 'Initial Probation Agreement',
    employeeId: 'emp_bindiya',
    employeeName: 'Adv. Bindiya Patel',
    groupId: 'cg_bindiya_1',
    groupName: 'Employment Contract 18/12/2024 to 18/12/2026',
    typeId: 'type_job',
    typeName: 'Job Contract',
    templateId: 'tpl_probation',
    startDate: '18/12/2024',
    endDate: '31/03/2026',
    status: ContractStatus.TERMINATED,
    currentVersion: 1,
    salaryComponents: [],
    overtime: { enabled: false, type: '1.5x', rateCalculation: 'fixed_hourly', rateValue: 150 },
    holidayRate: '1.5x',
    weekendRate: '1.5x',
    overtimeRate: '1.5x',
    holidayGroupIds: [],
    leaveAllocations: [],
    shiftId: '',
    shiftEffectiveDate: '',
    weeklyOffPattern: [],
    revisions: []
  }
];

const ContractListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [groups, setGroups] = useState<ContractGroup[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<'employee' | 'group'>('employee');
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContractGroup | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [contractsData, groupsData, staffData] = await Promise.all([
          fetchContracts(),
          fetchContractGroups(),
          fetchStaff()
        ]);
        
        let loadedGroups = Array.isArray(groupsData) && groupsData.length > 0 ? groupsData : INITIAL_DEMO_GROUPS;
        let loadedContracts = Array.isArray(contractsData) && contractsData.length > 0 ? contractsData : INITIAL_DEMO_CONTRACTS;
        let loadedStaff = Array.isArray(staffData) && staffData.length > 0 ? staffData : [
          { id: 'emp_bindiya', name: 'Adv. Bindiya Patel', employeeCode: 'EMP001', role: 'Stylist' }
        ];

        setGroups(loadedGroups);
        setContracts(loadedContracts);
        setStaff(loadedStaff);
      } catch (error) {
        console.error('Failed to load contract data, falling back to demo data:', error);
        setGroups(INITIAL_DEMO_GROUPS);
        setContracts(INITIAL_DEMO_CONTRACTS);
        setStaff([{ id: 'emp_bindiya', name: 'Adv. Bindiya Patel', employeeCode: 'EMP001', role: 'Stylist' }]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSaveGroup = async (groupData: any) => {
    try {
      const savedGroup = await saveContractGroup(groupData);
      setGroups(prev => {
        const exists = prev.some(g => g.id === savedGroup.id);
        if (exists) {
          return prev.map(g => g.id === savedGroup.id ? savedGroup : g);
        }
        return [savedGroup, ...prev];
      });
      setShowGroupModal(false);
      setEditingGroup(undefined);
    } catch (err) {
      console.error('Failed to save contract group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this contract group?')) return;
    try {
      await deleteContractGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      setContracts(prev => prev.filter(c => c.groupId !== groupId));
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  // Group contracts by Employee & Group
  const getContractsForGroup = (groupId: string) => {
    return contracts.filter(c => c.groupId === groupId);
  };

  const filteredGroups = groups.filter(g => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const groupNameMatch = (g.name || '').toLowerCase().includes(term);
    const empNameMatch = (g.employeeName || '').toLowerCase().includes(term);
    const empCodeMatch = (g.employeeCode || '').toLowerCase().includes(term);
    return groupNameMatch || empNameMatch || empCodeMatch;
  });

  return (
    <ContractModuleLayout>
      <div className="space-y-6">
        
        {/* Quick Stats Header Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Contract Groups', value: groups.length.toString(), color: 'text-indigo-600' },
            { label: 'Total Contracts', value: contracts.length.toString(), color: 'text-blue-600' },
            { label: 'Active Contracts', value: contracts.filter(c => c.status === ContractStatus.ACTIVE).length.toString(), color: 'text-emerald-600' },
            { label: 'Terminated / Expired', value: contracts.filter(c => c.status === ContractStatus.TERMINATED || c.status === ContractStatus.EXPIRED).length.toString(), color: 'text-rose-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-3 flex items-center justify-between rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">{stat.label}</span>
              <span className={`text-base font-bold ${stat.color}`}>{isLoading ? '-' : stat.value}</span>
            </div>
          ))}
        </div>

        {/* Toolbar: Search, Mode Switch, Filters & Add Group */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee, code or group..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setGroupBy('employee')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  groupBy === 'employee' 
                    ? 'bg-white text-blue-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Employee-wise
              </button>
              <button
                onClick={() => setGroupBy('group')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  groupBy === 'group' 
                    ? 'bg-white text-blue-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Group-wise
              </button>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
            <button 
              onClick={() => { setEditingGroup(undefined); setShowGroupModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer font-semibold"
            >
              <Plus className="w-4 h-4" />
              Create Contract Group
            </button>
          </div>
        </div>

        {/* ── Employee-wise Contract Group List ── */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Loading Contract Groups...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              No contract groups found. Click <strong>Create Contract Group</strong> to add one.
            </div>
          ) : (
            filteredGroups.map((group) => {
              const matchedEmp = staff.find(s => s.id === group.employeeId);
              const empName = group.employeeName || matchedEmp?.name || 'Adv. Bindiya Patel';
              const empCode = group.employeeCode || matchedEmp?.employeeCode || matchedEmp?.biometricCode || 'EMP001';
              const groupContracts = getContractsForGroup(group.id);
              const displayDateRange = group.startDate && group.endDate 
                ? `${group.startDate.includes('-') ? group.startDate.split('-').reverse().join('/') : group.startDate} - ${group.endDate.includes('-') ? group.endDate.split('-').reverse().join('/') : group.endDate}`
                : group.startDate || '18/12/2024 - 18/12/2026';

              return (
                <div key={group.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:border-slate-300">
                  
                  {/* ── Employee Contract Group Header Banner ── */}
                  <div className="bg-blue-50/50 border-b border-blue-100/60 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 leading-none">{empName}</h3>
                          <span className="text-slate-400 text-sm">•</span>
                          <span className="text-xs font-bold text-slate-600">{empCode}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          {group.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{displayDateRange}</span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        (group.status || 'Active').toLowerCase() === 'active' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {group.status || 'Active'}
                      </span>

                      <button 
                        onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Group options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Card Body: Contracts Section ── */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 tracking-tight">
                        Contracts ({groupContracts.length})
                      </h4>
                      <button
                        onClick={() => navigate(`/contracts/new?groupId=${group.id}&employeeId=${group.employeeId || ''}`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Contract
                      </button>
                    </div>

                    {/* Child Contracts list */}
                    <div className="space-y-2.5">
                      {groupContracts.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic border border-slate-100">
                          No contracts added to this group yet. Click <strong>+ Add Contract</strong> above.
                        </div>
                      ) : (
                        groupContracts.map((contract) => (
                          <div 
                            key={contract.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-slate-100 font-bold text-xs text-slate-700 rounded-md tracking-wider">
                                {contract.code || 'JOB'}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                contract.status === ContractStatus.ACTIVE 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : contract.status === ContractStatus.TERMINATED 
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {contract.status === ContractStatus.ACTIVE ? 'Active' : contract.status === ContractStatus.TERMINATED ? 'Terminated' : contract.status}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                {contract.startDate} - {contract.endDate || 'Ongoing'} • Version {contract.currentVersion || 1}
                              </span>
                            </div>

                            {/* Action Icon Buttons */}
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <button 
                                onClick={() => navigate(`/contracts/new?id=${contract.id}`)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                title="View Contract"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => navigate(`/contracts/new?id=${contract.id}`)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                title="Edit Contract"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" 
                                title="View Documents"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" 
                                title="Version History"
                              >
                                <GitBranch className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('Delete contract?')) {
                                    setContracts(prev => prev.filter(c => c.id !== contract.id));
                                  }
                                }}
                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                                title="Delete Contract"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create / Edit Group Modal */}
      <GroupFormModal
        isOpen={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(undefined); }}
        initialData={editingGroup}
        staffList={staff}
        onSave={handleSaveGroup}
      />
    </ContractModuleLayout>
  );
};

export default ContractListPage;
