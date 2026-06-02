import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, DollarSign, Clock, Calendar, Shield, Briefcase, FileText, Check, AlertCircle } from 'lucide-react';
import ContractModuleLayout from '../../components/ContractModuleLayout';
import MasterFormModal from '../../components/masters/MasterFormModal';
import { 
  fetchRoles, deleteRole, toggleRoleStatus,
  fetchShifts, deleteShift, toggleShiftStatus,
  fetchLeaveTypes, deleteLeaveType,
  fetchWorkWeeks, deleteWorkWeek, toggleWorkWeekStatus,
  fetchContractTypes, deleteContractType, toggleContractTypeStatus,
  fetchHolidayTemplates, deleteHolidayTemplate,
  fetchHolidays, deleteHoliday,
  fetchSalaryMasters, deleteSalaryMaster, toggleSalaryMasterStatus
} from '../../../../services/api';
import { useToastStore } from '../../../../stores/toastStore';

// Master categories tabs
const MASTER_TABS = [
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'shifts', label: 'Shifts', icon: Clock },
  { id: 'leaves', label: 'Leave Types', icon: Calendar },
  { id: 'workweeks', label: 'Work Weeks', icon: Calendar },
  { id: 'holidays', label: 'Holidays', icon: Shield },
  { id: 'types', label: 'Contract Types', icon: Briefcase },
  { id: 'salary', label: 'Salary Components', icon: DollarSign },
];

const ContractMastersPage: React.FC = () => {
  const toast = useToastStore();
  const [activeTab, setActiveTab] = useState('roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic masters collections
  const [mastersList, setMastersList] = useState<any[]>([]);

  // Holidays specific dual list
  const [occasionsList, setOccasionsList] = useState<any[]>([]);

  const loadMastersData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'roles') {
        const data = await fetchRoles();
        setMastersList(data);
      } else if (activeTab === 'shifts') {
        const data = await fetchShifts();
        setMastersList(data);
      } else if (activeTab === 'leaves') {
        const data = await fetchLeaveTypes();
        setMastersList(data);
      } else if (activeTab === 'workweeks') {
        const data = await fetchWorkWeeks();
        setMastersList(data);
      } else if (activeTab === 'types') {
        const data = await fetchContractTypes();
        setMastersList(data);
      } else if (activeTab === 'salary') {
        const data = await fetchSalaryMasters();
        setMastersList(data);
      } else if (activeTab === 'holidays') {
        const [templates, occasions] = await Promise.all([
          fetchHolidayTemplates(),
          fetchHolidays()
        ]);
        setMastersList(templates);
        setOccasionsList(occasions);
      }
    } catch (err) {
      toast.error('Failed to load master records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMastersData();
  }, [activeTab]);

  const getTabLabel = () => MASTER_TABS.find(t => t.id === activeTab)?.label || '';

  // Handle toggling Active status of records
  const handleToggleStatus = async (item: any) => {
    try {
      let updated = null;
      if (activeTab === 'roles') {
        updated = await toggleRoleStatus(item.id);
      } else if (activeTab === 'shifts') {
        updated = await toggleShiftStatus(item.id);
      } else if (activeTab === 'workweeks') {
        updated = await toggleWorkWeekStatus(item.id);
      } else if (activeTab === 'types') {
        updated = await toggleContractTypeStatus(item.id);
      } else if (activeTab === 'salary') {
        updated = await toggleSalaryMasterStatus(item.id);
      }
      
      if (updated) {
        toast.success(`${getTabLabel().replace(/s$/, '')} status toggled`);
        loadMastersData();
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  // Handle delete actions
  const handleDeleteItem = async (id: string, isOccasion = false) => {
    if (!window.confirm('Are you sure you want to delete this master record? This action cannot be undone.')) {
      return;
    }

    try {
      if (activeTab === 'roles') {
        await deleteRole(id);
      } else if (activeTab === 'shifts') {
        await deleteShift(id);
      } else if (activeTab === 'leaves') {
        await deleteLeaveType(id);
      } else if (activeTab === 'workweeks') {
        await deleteWorkWeek(id);
      } else if (activeTab === 'types') {
        await deleteContractType(id);
      } else if (activeTab === 'salary') {
        await deleteSalaryMaster(id);
      } else if (activeTab === 'holidays') {
        if (isOccasion) {
          await deleteHoliday(id);
        } else {
          await deleteHolidayTemplate(id);
        }
      }
      
      toast.success('Master record deleted successfully');
      loadMastersData();
    } catch (err) {
      toast.error('Failed to delete master record');
    }
  };

  // Filtered items based on search query
  const filteredItems = mastersList.filter(item => {
    const nameStr = item.name || item.occasionName || '';
    const codeStr = item.code || '';
    return nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
           codeStr.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredOccasions = occasionsList.filter(item => {
    return (item.occasionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (item.occasionType || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const renderItemDetails = (item: any) => {
    switch (activeTab) {
      case 'roles':
        return (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{item.description || 'No description provided'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
              item.isEmployee 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {item.isEmployee ? 'Employee Role' : 'Vendor/Other'}
            </span>
          </div>
        );
      case 'salary':
        return (
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              item.type === 'earning' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {item.type === 'earning' ? 'Earning' : 'Deduction'}
            </span>
            <span className="text-xs text-slate-500 font-bold capitalize">{item.calculationType}</span>
            <span className="text-sm font-extrabold text-slate-700">
              {item.calculationType === 'percentage' ? `${item.defaultAmount ?? 0}%` : `₹${Number(item.defaultAmount ?? 0).toLocaleString('en-IN')}`}
            </span>
          </div>
        );
      case 'shifts':
        return (
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="font-bold">{item.startTime} - {item.endTime}</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Break: {item.breakDuration || 0}m</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Grace: {item.gracePeriod || 0}m</span>
          </div>
        );
      case 'leaves':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-700 font-semibold">{item.daysAllowed} days/yr</span>
            <span className="text-xs text-slate-400">Notice: {item.advanceNoticeDays}d</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
              item.isPaid 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {item.isPaid ? 'Paid' : 'Unpaid'}
            </span>
            {item.allowHourly && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Hourly Limit: {item.hourlyHours}h
              </span>
            )}
            {item.neededDocument && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Requires Doc
              </span>
            )}
          </div>
        );
      case 'workweeks':
        return (
          <div className="flex flex-wrap gap-1">
            {(item.operationalDays || []).map((day: string) => (
              <span key={day} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-xs font-bold">
                {day.substring(0, 3)}
              </span>
            ))}
            {(item.operationalDays || []).length === 0 && (
              <span className="text-xs text-slate-400">No operational days selected</span>
            )}
          </div>
        );
      case 'types':
        return (
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{item.description || 'No description'}</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold font-mono">
              Templates: {(item.requiredDocuments || []).length} linked
            </span>
          </div>
        );
      case 'holidays':
        return (
          <div className="text-sm text-slate-500">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs">
              {item.type}
            </span>
            <span className="ml-3">{item.description}</span>
          </div>
        );
      default:
        return null;
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
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add {
              activeTab === 'types' ? 'Contract Type' : 
              activeTab === 'leaves' ? 'Leave Type' : 
              activeTab === 'workweeks' ? 'Work Week' :
              activeTab.replace(/s$/, '')
            }
          </button>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{activeTab === 'leaves' ? 'Code' : activeTab === 'salary' ? 'Code' : 'Info / Code'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Details</th>
                {activeTab !== 'leaves' && activeTab !== 'holidays' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading {getTabLabel().toLowerCase()}...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No {getTabLabel().toLowerCase()} records found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.name || item.occasionName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600">
                        {item.code || item.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {renderItemDetails(item)}
                    </td>
                    {activeTab !== 'leaves' && activeTab !== 'holidays' && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                            item.isActive
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    )}
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
                          onClick={() => handleDeleteItem(item.id)}
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
        </div>

        {/* Holidays Specific Subsection: Occasion List (Holiday Master) */}
        {activeTab === 'holidays' && !loading && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-8">
              <div>
                <h3 className="text-base font-bold text-slate-900">Holiday Occasions Master (Occasion Calendar)</h3>
                <p className="text-xs text-slate-500">Occasion dates mapped to specific holiday templates.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Occasion Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Start / End Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Template ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Occasion Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOccasions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No occasion dates found. Use the add button above and select "Holiday Occasion" to link dates!
                      </td>
                    </tr>
                  ) : (
                    filteredOccasions.map((occ) => (
                      <tr key={occ.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{occ.occasionName}</p>
                          <p className="text-xs text-slate-400">{occ.description}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          {occ.startDate} {occ.endDate && occ.endDate !== occ.startDate ? `to ${occ.endDate}` : ''}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono font-medium">
                            {mastersList.find(t => t.id === occ.templateId)?.name || occ.templateId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
                            {occ.occasionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setEditingItem(occ); setShowFormModal(true); }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(occ.id, true)}
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
            </div>
          </div>
        )}
      </div>

      {/* Master Form Modal */}
      <MasterFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingItem(null); }}
        masterType={activeTab}
        initialData={editingItem}
        onSave={() => { setShowFormModal(false); setEditingItem(null); loadMastersData(); }}
      />
    </ContractModuleLayout>
  );
};

export default ContractMastersPage;
