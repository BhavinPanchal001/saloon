import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ChevronRight, User, Briefcase, DollarSign, Calendar, Clock, Edit, Plus, AlertCircle, Shield, FileCheck, CheckCircle } from 'lucide-react';
import { useToastStore } from '../../../../stores/toastStore';
import { 
  fetchStaff, saveContract, fetchSalaryMasters, 
  fetchContractGroups, fetchContractTypes, fetchShifts, 
  fetchWorkWeeks, fetchHolidayTemplates, fetchLeaveTypes 
} from '../../../../services/api';
import { ContractStatus } from '../../types';

const TABS = [
  { id: 'basic', label: '1. Group & Type', icon: User },
  { id: 'financials', label: '2. Salary Components', icon: DollarSign },
  { id: 'shift', label: '3. Shift & Week', icon: Clock },
  { id: 'policies', label: '4. Terms & Overtime', icon: Briefcase },
  { id: 'benefits', label: '5. Holidays & Leaves', icon: Calendar },
];

const ContractFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastStore();
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Master collections loaded dynamically
  const [staffList, setStaffList] = useState<any[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [contractTypesList, setContractTypesList] = useState<any[]>([]);
  const [shiftsList, setShiftsList] = useState<any[]>([]);
  const [workWeeksList, setWorkWeeksList] = useState<any[]>([]);
  const [salaryMasters, setSalaryMasters] = useState<any[]>([]);
  const [holidayTemplates, setHolidayTemplates] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  // Selected templates inside contract type
  const [linkedTemplates, setLinkedTemplates] = useState<any[]>([]);

  // Salary modal helper state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedSalaryMaster, setSelectedSalaryMaster] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<any>({
    code: 'CON-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    title: '',
    employeeId: '',
    groupId: '',
    typeId: '',
    templateId: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    notes: '',
    
    // Compensation
    salaryComponents: [],
    
    // Overtime
    overtime: {
      enabled: false,
      type: '1.5x',
      rateCalculation: 'fixed_hourly',
      rateValue: 150
    },

    // Shifts
    shiftId: '',
    workWeekId: '',

    // Relational selected arrays
    holidayGroupIds: [], // Selected holiday template IDs
    leaveAllocations: [], // Selected leave type IDs
  });

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [staff, groups, cTypes, shifts, wWeeks, salaryComps, hTemplates, leaves] = await Promise.all([
          fetchStaff(),
          fetchContractGroups(),
          fetchContractTypes(),
          fetchShifts(),
          fetchWorkWeeks(),
          fetchSalaryMasters(),
          fetchHolidayTemplates(),
          fetchLeaveTypes()
        ]);

        setStaffList(staff);
        setGroupsList(groups);
        setContractTypesList(cTypes.filter((c: any) => c.isActive));
        setShiftsList(shifts.filter((s: any) => s.isActive));
        setWorkWeeksList(wWeeks.filter((w: any) => w.isActive));
        setSalaryMasters(salaryComps.filter((s: any) => s.isActive));
        setHolidayTemplates(hTemplates.filter((h: any) => h.isActive));
        setLeaveTypes(leaves);
      } catch (err) {
        console.error('Failed to load form master options:', err);
      }
    };
    loadMasters();
  }, []);

  // Parse query parameters to pre-fill Employee & Contract Group
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlGroupId = params.get('groupId');
    const urlEmployeeId = params.get('employeeId');
    
    if (urlGroupId) {
      handleInputChange('groupId', urlGroupId);
    }
    if (urlEmployeeId) {
      handleInputChange('employeeId', urlEmployeeId);
      
      // Auto-select the matching group if it exists
      if (groupsList.length > 0) {
        const matchingGroup = groupsList.find(g => g.employeeId === urlEmployeeId);
        if (matchingGroup) {
          handleInputChange('groupId', matchingGroup.id);
        }
      }
    }
  }, [location.search, groupsList]);

  // Synchronize Employee and Group selections dynamically
  useEffect(() => {
    if (!formData.employeeId) return;
    
    const matchingGroup = groupsList.find(g => g.employeeId === formData.employeeId);
    if (matchingGroup) {
      handleInputChange('groupId', matchingGroup.id);
    } else {
      // If employee doesn't match current group, reset group selection
      const currentGroup = groupsList.find(g => g.id === formData.groupId);
      if (currentGroup && currentGroup.employeeId && currentGroup.employeeId !== formData.employeeId) {
        handleInputChange('groupId', '');
      }
    }
  }, [formData.employeeId, groupsList]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // When Contract Type changes, dynamically load its templates
  const handleContractTypeChange = (typeId: string) => {
    handleInputChange('typeId', typeId);
    handleInputChange('templateId', '');
    const selectedType = contractTypesList.find(t => t.id === typeId);
    if (selectedType && selectedType.requiredDocuments) {
      setLinkedTemplates(selectedType.requiredDocuments);
    } else {
      setLinkedTemplates([]);
    }
  };

  // Salary Component handling
  const handleAddSalaryComponent = () => {
    if (!selectedSalaryMaster || !customAmount) {
      toast.error('Select a component and input amount/percentage');
      return;
    }
    const exists = formData.salaryComponents.some((c: any) => c.masterId === selectedSalaryMaster.id);
    if (exists) {
      toast.error('Component is already added to this contract');
      return;
    }

    const component = {
      id: `comp_${Date.now()}`,
      masterId: selectedSalaryMaster.id,
      name: selectedSalaryMaster.name,
      type: selectedSalaryMaster.type,
      calculationType: selectedSalaryMaster.calculationType,
      amount: Number(customAmount)
    };

    setFormData((prev: any) => ({
      ...prev,
      salaryComponents: [...prev.salaryComponents, component]
    }));
    setShowSalaryModal(false);
    setSelectedSalaryMaster(null);
    setCustomAmount('');
    toast.success('Salary component mapped');
  };

  const handleRemoveSalaryComponent = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      salaryComponents: prev.salaryComponents.filter((c: any) => c.id !== id)
    }));
    toast.success('Salary component unmapped');
  };

  // Multi-select for Holidays
  const handleHolidayToggle = (templateId: string) => {
    const current = formData.holidayGroupIds || [];
    let next = [];
    if (current.includes(templateId)) {
      next = current.filter((id: string) => id !== templateId);
    } else {
      next = [...current, templateId];
    }
    handleInputChange('holidayGroupIds', next);
  };

  // Multi-select for Leaves
  const handleLeaveToggle = (leaveId: string) => {
    const current = formData.leaveAllocations || [];
    let next = [];
    if (current.includes(leaveId)) {
      next = current.filter((id: string) => id !== leaveId);
    } else {
      next = [...current, leaveId];
    }
    handleInputChange('leaveAllocations', next);
  };

  const handleSave = async (status: string) => {
    if (!formData.title || !formData.employeeId || !formData.groupId || !formData.typeId) {
      toast.error('Please fill in all required fields on the first tab');
      setActiveTab('basic');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...formData, status };
      await saveContract(payload);
      toast.success(status === 'active' ? 'Contract finalized and active!' : 'Contract saved as draft');
      navigate('/contracts/list');
    } catch (err) {
      toast.error('Failed to save contract');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Form Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Draft New Employee Contract</h1>
              <p className="text-sm text-slate-500">Drafting agreement terms with masters association.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave('draft')}
              disabled={isSaving}
              className="btn-premium-outline !py-2 !px-4 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave('active')}
              disabled={isSaving}
              className="btn-premium-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Finalize & Activate'}
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
                w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-xl border-2 transition-all duration-200
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
        <div className="flex-1 space-y-8 glass-card p-8 bg-white border border-slate-200 rounded-3xl shadow-sm min-h-[600px]">
          
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-1">General Mapping</h2>
                <p className="text-sm text-slate-500 mb-6">Enter timeline dates and map contract template parameters.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Contract Code *</label>
                    <input 
                      type="text" 
                      className="premium-input w-full"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Contract Agreement Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Senior Hair Stylist Contract 2026" 
                      className="premium-input w-full"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Select Employee *</label>
                    <select
                      className="premium-input w-full"
                      value={formData.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      required
                    >
                      <option value="">Select Employee...</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Parent Contract Group *</label>
                    <select
                      className="premium-input w-full"
                      value={formData.groupId}
                      onChange={(e) => handleInputChange('groupId', e.target.value)}
                      required
                    >
                      <option value="">Select Contract Group...</option>
                      {groupsList
                        .filter(g => !formData.employeeId || g.employeeId === formData.employeeId || !g.employeeId)
                        .map((g) => (
                          <option key={g.id} value={g.id}>{g.name} ({g.duration})</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Contract Type *</label>
                    <select
                      className="premium-input w-full"
                      value={formData.typeId}
                      onChange={(e) => handleContractTypeChange(e.target.value)}
                      required
                    >
                      <option value="">Choose Contract Type...</option>
                      {contractTypesList.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Contract Template (Linked Masters)</label>
                    <select
                      className="premium-input w-full"
                      value={formData.templateId}
                      onChange={(e) => handleInputChange('templateId', e.target.value)}
                      disabled={!formData.typeId}
                    >
                      <option value="">Select Template...</option>
                      {linkedTemplates.map((t, idx) => (
                        <option key={idx} value={t.templateName}>{t.templateName} (v{t.version})</option>
                      ))}
                      {linkedTemplates.length === 0 && formData.typeId && (
                        <option disabled>No templates linked to this type</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Start Date *</label>
                    <input 
                      type="date" 
                      className="premium-input w-full"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">End Date</label>
                    <input 
                      type="date" 
                      className="premium-input w-full"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Internal Remarks / Notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Specify any internal remarks for HR..." 
                  className="premium-input w-full"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </section>
            </div>
          )}

          {/* TAB 2: SALARY COMPONENTS */}
          {activeTab === 'financials' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Salary Mapping</h2>
                  <p className="text-sm text-slate-500">Configure salary components applicable to this contract.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(true)}
                  className="btn-premium-primary flex items-center gap-1.5 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Map Component
                </button>
              </div>

              <div className="space-y-3">
                {formData.salaryComponents.map((component: any) => (
                  <div key={component.id} className="flex items-center justify-between p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        component.type === 'earning' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {component.type}
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1">{component.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{component.calculationType} component</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-base font-extrabold text-slate-900">
                        {component.calculationType === 'percentage' ? `${component.amount ?? 0}%` : `₹${Number(component.amount ?? 0).toLocaleString('en-IN')}`}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSalaryComponent(component.id)}
                        className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {formData.salaryComponents.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                    <p className="text-sm font-bold">No salary components mapped yet.</p>
                    <p className="text-xs mt-1">Click the Map Component button to start building the payout.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SHIFT & WEEK */}
          {activeTab === 'shift' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Shift Pattern & Working Days</h2>
                <p className="text-sm text-slate-500">Link operational shifts and work week constraints to this contract.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Select Shift*</label>
                  <select
                    className="premium-input w-full"
                    value={formData.shiftId}
                    onChange={(e) => handleInputChange('shiftId', e.target.value)}
                    required
                  >
                    <option value="">Select Operational Shift...</option>
                    {shiftsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Select Work Week*</label>
                  <select
                    className="premium-input w-full"
                    value={formData.workWeekId}
                    onChange={(e) => handleInputChange('workWeekId', e.target.value)}
                    required
                  >
                    <option value="">Select Work Week...</option>
                    {workWeeksList.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({(w.operationalDays || []).length} days)</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TERMS & OVERTIME */}
          {activeTab === 'policies' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Contract Overtime & Status</h2>
                <p className="text-sm text-slate-500">Configure overtime details and current drafting status.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Contract Status*</label>
                  <select
                    className="premium-input w-full bg-white"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    required
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block">Overtime Policy</label>
                  <div className="flex gap-4 items-center pt-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.overtime?.enabled}
                        onChange={() => handleNestedInputChange('overtime', 'enabled', !formData.overtime?.enabled)}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                      />
                      Is Overtime Allowed?
                    </label>
                  </div>
                </div>

                {formData.overtime?.enabled && (
                  <>
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-sm font-bold text-slate-700">Overtime Multiplier Per Hour*</label>
                      <select
                        className="premium-input w-full bg-white"
                        value={formData.overtime?.type || '1.5x'}
                        onChange={(e) => handleNestedInputChange('overtime', 'type', e.target.value)}
                      >
                        <option value="1x">1x Normal Hourly Rate</option>
                        <option value="1.5x">1.5x Normal Hourly Rate</option>
                        <option value="2x">2x Normal Hourly Rate</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-sm font-bold text-slate-700">Fixed Overtime Rate (INR/Hr)</label>
                      <input 
                        type="number"
                        placeholder="150"
                        className="premium-input w-full bg-white"
                        value={formData.overtime?.rateValue || ''}
                        onChange={(e) => handleNestedInputChange('overtime', 'rateValue', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: HOLIDAYS & LEAVES */}
          {activeTab === 'benefits' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Holidays & Leave Allocation</h2>
                <p className="text-sm text-slate-500">Check multiple holiday templates and leave types to map them onto the employee contract.</p>
              </div>

              {/* Holidays list */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">1. Select Holiday Groups / Templates*</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {holidayTemplates.map((template) => {
                    const isSelected = formData.holidayGroupIds.includes(template.id);
                    return (
                      <div 
                        key={template.id} 
                        onClick={() => handleHolidayToggle(template.id)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-start justify-between ${
                          isSelected 
                            ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{template.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{template.type} • {template.isRecurring ? 'Recurring' : 'One-off'}</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-indigo-600 mt-1"
                        />
                      </div>
                    )})}
                </div>
              </div>

              {/* Leaves list */}
              <div className="space-y-3 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">2. Map Leave Types*</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leaveTypes.map((leave) => {
                    const isSelected = formData.leaveAllocations.includes(leave.id);
                    return (
                      <div 
                        key={leave.id} 
                        onClick={() => handleLeaveToggle(leave.id)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-start justify-between ${
                          isSelected 
                            ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{leave.name} ({leave.code})</p>
                          <p className="text-xs text-slate-500 mt-1">{leave.daysAllowed} days/yr • {leave.isPaid ? 'Paid' : 'Unpaid'}</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-indigo-600 mt-1"
                        />
                      </div>
                    )})}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add Salary Component Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Map Salary Component</h3>
                <p className="text-xs text-slate-400 mt-0.5">Link an active salary component to the contract.</p>
              </div>
              <button
                onClick={() => { setShowSalaryModal(false); setSelectedSalaryMaster(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Choose Component*</label>
                <select
                  className="premium-input w-full"
                  value={selectedSalaryMaster?.id || ''}
                  onChange={(e) => {
                    const master = salaryMasters.find(s => s.id === e.target.value);
                    setSelectedSalaryMaster(master);
                    setCustomAmount(master?.defaultAmount?.toString() || '');
                  }}
                >
                  <option value="">Choose Component...</option>
                  {salaryMasters.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              {selectedSalaryMaster && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                    <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">
                      {selectedSalaryMaster.type.toUpperCase()}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">{selectedSalaryMaster.description || 'No description provided'}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Calculation Logic: {selectedSalaryMaster.calculationType} (default: {selectedSalaryMaster.defaultAmount})
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Custom Payout Value ({selectedSalaryMaster.calculationType === 'percentage' ? '%' : 'INR'})*
                    </label>
                    <input 
                      type="number"
                      placeholder="e.g. 30000"
                      className="premium-input w-full"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowSalaryModal(false); setSelectedSalaryMaster(null); }}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSalaryComponent}
                className="flex-1 py-3 px-6 flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Component
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractFormPage;
