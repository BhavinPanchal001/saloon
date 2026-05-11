import React, { useState, useEffect } from 'react';
import { Save, X, ChevronRight, User, Users, Briefcase, DollarSign, Calendar, Clock, Edit, Plus, Building2, Heart, Baby, Umbrella, AlertCircle, Shield, FileCheck, FileUp, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../../../stores/toastStore';
import { fetchStaff, saveContract, fetchSalaryMasters } from '../../../../services/mockApi';
import { Contract, ContractStatus, SalaryComponent, ComponentType, CalculationType, SalaryMaster } from '../../types';

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'mapping', label: 'Mapping', icon: Briefcase },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'policies', label: 'Policies', icon: Calendar },
  { id: 'shift', label: 'Shift & Hours', icon: Clock },
];

const ContractFormPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [salaryMasters, setSalaryMasters] = useState<SalaryMaster[]>([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedSalaryMaster, setSelectedSalaryMaster] = useState<SalaryMaster | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const navigate = useNavigate();
  const toast = useToastStore();

  // Form state
  const [formData, setFormData] = useState<Partial<Contract>>({
    code: '',
    title: '',
    employeeId: '',
    groupId: '',
    typeId: '',
    templateId: '',
    startDate: '',
    endDate: '',
    status: ContractStatus.DRAFT,
    salaryComponents: [],
    overtime: {
      enabled: false,
      type: 'none',
      rateCalculation: 'fixed_hourly',
      rateValue: 0,
    },
    holidayRate: '1x',
    weekendRate: '1x',
    overtimeRate: '1.5x',
    holidayGroupIds: [],
    leaveAllocations: [],
    shiftId: '',
    shiftEffectiveDate: '',
    weeklyOffPattern: [],
    revisions: [],
    currentVersion: 1,
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [staff, salaryMastersData] = await Promise.all([
          fetchStaff(),
          fetchSalaryMasters()
        ]);
        setStaffList(staff);
        setSalaryMasters(salaryMastersData.filter((sm: SalaryMaster) => sm.isActive));
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const handleInputChange = (field: keyof Contract, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSalaryComponent = () => {
    if (!selectedSalaryMaster || !customAmount) {
      toast.error('Please select a salary component and enter amount');
      return;
    }
    
    const component: SalaryComponent = {
      id: Date.now().toString(),
      name: selectedSalaryMaster.name,
      type: selectedSalaryMaster.type as ComponentType,
      calculationType: selectedSalaryMaster.calculationType as CalculationType,
      amount: Number(customAmount) || 0,
    };
    
    setFormData(prev => ({
      ...prev,
      salaryComponents: [...(prev.salaryComponents || []), component],
    }));
    
    setSelectedSalaryMaster(null);
    setCustomAmount('');
    setShowSalaryModal(false);
    toast.success('Salary component added');
  };

  const handleRemoveSalaryComponent = (componentId: string) => {
    setFormData(prev => ({
      ...prev,
      salaryComponents: prev.salaryComponents?.filter(c => c.id !== componentId) || [],
    }));
    toast.success('Salary component removed');
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const contractData = { ...formData, status: ContractStatus.DRAFT };
      await saveContract(contractData);
      toast.success('Contract saved as draft');
    } catch (error) {
      toast.error('Failed to save contract');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!formData.employeeId) {
      toast.error('Please select an employee before finalizing');
      return;
    }
    setIsSaving(true);
    try {
      const contractData = { ...formData, status: ContractStatus.ACTIVE };
      await saveContract(contractData);
      toast.success('Contract finalized successfully');
      navigate('/contracts/list');
    } catch (error) {
      toast.error('Failed to finalize contract');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Form Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-navy-100/50 px-8 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-navy-50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-navy-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-navy-900 leading-tight">Create New Contract</h1>
              <p className="text-sm text-navy-500">Drafting version 1.0 of the agreement.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="btn-premium-outline !py-2 !px-4 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={handleFinalize}
              disabled={isSaving}
              className="btn-premium-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Processing...' : 'Finalize Contract'}
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
                  ? 'bg-navy-50 border-navy-600 text-navy-700 shadow-sm'
                  : 'bg-transparent border-transparent text-navy-400 hover:bg-white hover:text-navy-900'}
              `}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-navy-600' : 'text-navy-300'}`} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Form Content Area */}
        <div className="flex-1 space-y-8 glass-card p-8 min-h-[600px]">
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <section>
                <h2 className="text-lg font-bold text-navy-900 mb-1">General Information</h2>
                <p className="text-sm text-navy-500 mb-6">Enter the primary details for this contract.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-navy-700">Contract Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Senior Hair Stylist Agreement" 
                      className="premium-input"
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-navy-700">Contract Code *</label>
                    <input 
                      type="text" 
                      placeholder="CON-XXXXX" 
                      className="premium-input"
                      value={formData.code || ''}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-navy-700">Start Date *</label>
                    <input 
                      type="date" 
                      className="premium-input"
                      value={formData.startDate || ''}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-navy-700">End Date (Optional)</label>
                    <input 
                      type="date" 
                      className="premium-input"
                      value={formData.endDate || ''}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section>
                <label className="text-sm font-semibold text-navy-700 block mb-2">Contract Remarks (Internal)</label>
                <textarea 
                  rows={4} 
                  placeholder="Add any special conditions or notes here..." 
                  className="premium-input"
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </section>
            </div>
          )}

          {activeTab === 'financials' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-lg font-bold text-navy-900">Salary Components</h2>
                <p className="text-sm text-navy-500">Configure earnings and deductions for this contract.</p>

                <div className="space-y-4">
                   {/* Dynamic salary components list */}
                   {formData.salaryComponents?.map((component) => (
                     <div key={component.id} className="flex items-center justify-between p-4 bg-navy-50/50 border border-navy-100 rounded-xl">
                        <div className="flex gap-4 items-center">
                          <div className={`p-2 rounded-lg font-bold text-xs ${component.type === ComponentType.EARNING ? 'bg-navy-100 text-navy-600' : 'bg-rose-100 text-rose-600'}`}>
                            {component.type === ComponentType.EARNING ? 'EARNING' : 'DEDUCTION'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-navy-900">{component.name}</p>
                            <p className="text-xs text-navy-500">{component.calculationType} • Monthly</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-lg font-extrabold ${component.type === ComponentType.EARNING ? 'text-navy-900' : 'text-rose-600'}`}>
                            {component.type === ComponentType.EARNING ? '' : '-'}₹{component.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <button 
                            onClick={() => handleRemoveSalaryComponent(component.id)}
                            className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                   ))}
                   {(!formData.salaryComponents || formData.salaryComponents.length === 0) && (
                     <div className="text-center py-8 text-navy-400">
                       <p className="text-sm">No salary components added yet.</p>
                       <p className="text-xs mt-1">Click below to add your first component.</p>
                     </div>
                   )}

                   <button
                      onClick={() => setShowSalaryModal(true)}
                      className="w-full py-4 border-2 border-dashed border-navy-200 rounded-xl text-navy-500 hover:border-navy-500 hover:text-navy-600 hover:bg-navy-50/50 transition-all font-semibold flex items-center justify-center gap-2"
                   >
                      <DollarSign className="w-4 h-4" />
                      Choose from Salary Components
                   </button>
                </div>

                <div className="mt-8 p-6 rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-50/50 to-navy-100/30">
                   {(() => {
                     const totalEarnings = formData.salaryComponents?.filter(c => c.type === ComponentType.EARNING).reduce((sum, c) => sum + c.amount, 0) || 0;
                     const totalDeductions = formData.salaryComponents?.filter(c => c.type === ComponentType.DEDUCTION).reduce((sum, c) => sum + c.amount, 0) || 0;
                     const netPayable = totalEarnings - totalDeductions;
                     return (
                       <>
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-navy-600">Total Earnings</span>
                            <span className="font-bold text-navy-900">₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                         </div>
                         <div className="flex justify-between items-center mb-4 text-rose-600">
                            <span className="text-sm">Total Deductions</span>
                            <span className="font-bold">-₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                         </div>
                         <div className="h-px bg-navy-200 my-4" />
                         <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-navy-900">Net Payable</span>
                            <span className="text-xl font-extrabold text-gold-600">₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                         </div>
                       </>
                     );
                   })()}
                </div>
             </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-lg font-bold text-navy-900">Contract Policies</h2>
                <p className="text-sm text-navy-500">Define notice period, probation, overtime, and termination rules for this contract.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-navy-700">Probation Period</label>
                  <select className="premium-input">
                    <option value="">Select probation period</option>
                    <option value="1">1 Month</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-navy-700">Notice Period</label>
                  <select className="premium-input">
                    <option value="">Select notice period</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-navy-700">Overtime Policy</label>
                  <select className="premium-input">
                    <option value="">Select overtime policy</option>
                    <option value="none">No Overtime</option>
                    <option value="1x">1x Rate</option>
                    <option value="1.5x">1.5x Rate</option>
                    <option value="2x">2x Rate</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-navy-700">Late Arrival Policy</label>
                  <select className="premium-input">
                    <option value="">Select late arrival policy</option>
                    <option value="none">No Penalty</option>
                    <option value="warning">Warning After 3 Times</option>
                    <option value="deduct">Salary Deduction</option>
                  </select>
                </div>
              </div>

              {/* Pay Rate Multipliers */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Pay Rate Multipliers</h3>
                  <p className="text-xs text-navy-500 mt-0.5">Set the pay multiplier applied when staff work on holidays, weekends, or overtime hours.</p>
                </div>

                {(
                  [
                    { key: 'holidayRate', label: 'Holiday Pay Rate', description: 'Applied when working on a public holiday' },
                    { key: 'weekendRate', label: 'Weekend Pay Rate', description: 'Applied when working on a weekend day' },
                    { key: 'overtimeRate', label: 'Overtime Pay Rate', description: 'Applied for hours worked beyond the contracted shift' },
                  ] as { key: 'holidayRate' | 'weekendRate' | 'overtimeRate'; label: string; description: string }[]
                ).map(({ key, label, description }) => (
                  <div key={key} className="p-4 rounded-2xl border border-navy-100 bg-navy-50/30 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-navy-800">{label}</p>
                      <p className="text-xs text-navy-500">{description}</p>
                    </div>
                    <div className="flex gap-3">
                      {(['1x', '1.5x', '2x'] as const).map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleInputChange(key, rate)}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200
                            ${formData[key] === rate
                              ? 'bg-navy-600 border-navy-600 text-white shadow-md shadow-navy-200'
                              : 'bg-white border-navy-200 text-navy-500 hover:border-navy-400 hover:text-navy-700'
                            }`}
                        >
                          {rate}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-navy-700">Termination Clause</label>
                <textarea rows={4} placeholder="Describe the terms under which this contract may be terminated by either party..." className="premium-input" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-navy-700">Confidentiality & Non-Compete</label>
                <textarea rows={3} placeholder="Specify any confidentiality or non-compete obligations..." className="premium-input" />
              </div>

              <div className="p-5 rounded-2xl border border-gold-100 bg-gold-50/30 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-gold-600 mt-0.5 shrink-0" />
                <p className="text-sm text-gold-700">
                  Policies defined here will be legally binding. Ensure all terms comply with local labor regulations before finalizing the contract.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div>
                  <h2 className="text-lg font-bold text-navy-900">Shift & Working Hours</h2>
                  <p className="text-sm text-navy-500">Assign a shift pattern and define working hours for this contract.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { name: 'Standard Day Shift', time: '09:00 AM - 06:00 PM', days: 'Mon - Sat' },
                    { name: 'Evening Shift', time: '02:00 PM - 10:00 PM', days: 'Mon - Sat' },
                  ].map((shift, i) => (
                    <div key={i} className="p-4 border border-navy-100 rounded-2xl hover:border-navy-600 hover:bg-navy-50/50 cursor-pointer transition-all group relative">
                       <div className="flex justify-between items-start mb-2">
                          <div className="p-2 bg-navy-50 rounded-lg group-hover:bg-navy-100 group-hover:text-navy-600 transition-colors">
                             <Clock className="w-4 h-4" />
                          </div>
                          <input type="radio" name="shift" className="w-4 h-4 accent-navy-600" defaultChecked={i === 0} />
                       </div>
                       <p className="text-sm font-bold text-navy-900">{shift.name}</p>
                       <p className="text-xs text-navy-500 mt-1">{shift.time}</p>
                       <p className="text-xs font-semibold text-gold-600 mt-2">{shift.days}</p>
                    </div>
                  ))}

                  <div className="p-6 bg-navy-50/50 rounded-2xl border border-navy-100 md:col-span-2">
                     <h4 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-navy-600" />
                        Shift Configuration
                     </h4>
                     <p className="text-xs text-navy-500 leading-relaxed">
                        Select a shift from the list above. Shifts are managed by administrators in the Global Masters section. If you don't see the shift you need, please contact your administrator.
                     </p>
                  </div>
               </div>
            </div>
          )}

          {/* Mapping Tab */}
          {activeTab === 'mapping' && (
            <div className="p-6 space-y-6">
              {/* Employee Assignment */}
              <div className="flex items-start gap-4 rounded-2xl border border-navy-100 bg-navy-50/30 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100">
                  <User className="h-5 w-5 text-navy-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-navy-900">Employee Assignment *</h4>
                  <p className="text-sm text-navy-600">Link this contract to a specific employee</p>
                  <div className="mt-4">
                    <select 
                      className="premium-input w-full max-w-md"
                      value={formData.employeeId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedStaff = staffList.find(s => s.id === selectedId);
                        handleInputChange('employeeId', selectedId);
                        handleInputChange('employeeName', selectedStaff?.name || '');
                      }}
                    >
                      <option value="">Select Employee</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} - {staff.role} ({staff.assignedOutletName})
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.employeeId && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-navy-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-navy-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-navy-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-navy-900">
                            {staffList.find(s => s.id === formData.employeeId)?.name}
                          </p>
                          <p className="text-sm text-navy-500">
                            {staffList.find(s => s.id === formData.employeeId)?.role} • {staffList.find(s => s.id === formData.employeeId)?.assignedOutletName}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-navy-100 bg-navy-50/30 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100">
                  <Building2 className="h-5 w-5 text-navy-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-navy-900">Outlet Mapping</h4>
                  <p className="text-sm text-navy-600">Assign contract to specific outlet locations</p>
                  <div className="mt-4">
                    <select className="premium-input w-full max-w-md">
                      <option value="">Select Primary Outlet</option>
                      <option value="hsr">HSR Layout</option>
                      <option value="koramangala">Koramangala</option>
                      <option value="indiranagar">Indiranagar</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-navy-100 bg-white/60 p-5">
                  <h4 className="font-semibold text-navy-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-navy-500" />
                    Annual Leave
                  </h4>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="label-text">Entitled Days</label>
                      <input type="number" className="premium-input" defaultValue={12} />
                    </div>
                    <div>
                      <label className="label-text">Carry Forward (Max)</label>
                      <input type="number" className="premium-input" defaultValue={5} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-navy-100 bg-white/60 p-5">
                  <h4 className="font-semibold text-navy-900 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" />
                    Sick Leave
                  </h4>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="label-text">Entitled Days</label>
                      <input type="number" className="premium-input" defaultValue={14} />
                    </div>
                    <div>
                      <label className="label-text">Medical Certificate Required</label>
                      <select className="premium-input">
                        <option>After 2 consecutive days</option>
                        <option>Always required</option>
                        <option>Not required</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-navy-100 bg-white/60 p-5">
                  <h4 className="font-semibold text-navy-900 flex items-center gap-2">
                    <Baby className="h-5 w-5 text-gold-500" />
                    Maternity Leave
                  </h4>
                  <div className="mt-4">
                    <label className="label-text">Entitled Days</label>
                    <input type="number" className="premium-input" defaultValue={90} />
                  </div>
                </div>

                <div className="rounded-2xl border border-navy-100 bg-white/60 p-5">
                  <h4 className="font-semibold text-navy-900 flex items-center gap-2">
                    <Umbrella className="h-5 w-5 text-blue-500" />
                    Emergency Leave
                  </h4>
                  <div className="mt-4">
                    <label className="label-text">Entitled Days (Per Year)</label>
                    <input type="number" className="premium-input" defaultValue={3} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gold-100 bg-gold-50/30 p-5">
                <h4 className="font-semibold text-gold-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Leave Policy Notes
                </h4>
                <p className="mt-2 text-sm text-gold-700">
                  Configure leave entitlements according to local labor laws and company policy. 
                  Changes will apply to all staff under this contract.
                </p>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="p-6 space-y-6">
              <div className="rounded-2xl border border-navy-100 bg-white/60 p-5">
                <h4 className="font-semibold text-navy-900 mb-4">Statutory Contributions</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-navy-50 bg-navy-50/30 p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-navy-600" />
                      <div>
                        <p className="font-medium text-navy-900">EPF (Employees Provident Fund)</p>
                        <p className="text-xs text-slate-500">Employer contribution: 12% | Employee: 11%</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked className="peer sr-only" />
                      <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-navy-600"></div>
                      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-navy-50 bg-navy-50/30 p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-navy-600" />
                      <div>
                        <p className="font-medium text-navy-900">SOCSO (Social Security)</p>
                        <p className="text-xs text-slate-500">Employer contribution: 1.75% | Employee: 0.5%</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked className="peer sr-only" />
                      <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-navy-600"></div>
                      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-navy-50 bg-navy-50/30 p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-navy-600" />
                      <div>
                        <p className="font-medium text-navy-900">EIS (Employment Insurance)</p>
                        <p className="text-xs text-slate-500">Employer contribution: 0.2% | Employee: 0.2%</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked className="peer sr-only" />
                      <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-navy-600"></div>
                      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-navy-100 bg-white/60 p-5">
                <h4 className="font-semibold text-navy-900 mb-4">Tax Configuration</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-text">Tax Category</label>
                    <select className="premium-input">
                      <option>Resident Individual</option>
                      <option>Non-Resident</option>
                      <option>Expatriate</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-text">PCB (Monthly Tax Deduction)</label>
                    <select className="premium-input">
                      <option>Schedule 1 - Normal</option>
                      <option>Schedule 2 - Arrears</option>
                      <option>Schedule 3 - Bonus</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="p-6 space-y-6">
              <div className="rounded-2xl border border-navy-100 bg-white/60 p-5">
                <h4 className="font-semibold text-navy-900 mb-4">Required Documents</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Employment Contract', required: true, status: 'uploaded' },
                    { name: 'IC/Passport Copy', required: true, status: 'missing' },
                    { name: 'Bank Account Details', required: true, status: 'uploaded' },
                    { name: 'Emergency Contact Form', required: true, status: 'uploaded' },
                    { name: 'Medical Certificate (if applicable)', required: false, status: 'missing' },
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-navy-50 bg-navy-50/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${doc.status === 'uploaded' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          {doc.status === 'uploaded' ? (
                            <FileCheck className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <FileUp className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-navy-900">{doc.name}</p>
                          <p className="text-xs text-slate-500">
                            {doc.required ? 'Required' : 'Optional'} • {doc.status === 'uploaded' ? 'Uploaded' : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <button className={`btn-premium-outline !py-1.5 !px-3 text-xs ${doc.status === 'uploaded' ? '' : 'animate-pulse'}`}>
                        {doc.status === 'uploaded' ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-navy-300 bg-navy-50/20 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-100">
                  <Upload className="h-8 w-8 text-navy-600" />
                </div>
                <h4 className="mt-4 font-semibold text-navy-900">Upload Additional Documents</h4>
                <p className="mt-2 text-sm text-slate-500">Drag and drop files here or click to browse</p>
                <button className="btn-premium-outline mt-4">
                  Select Files
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Salary Component Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">Add Salary Component</h3>
              <button
                onClick={() => setShowSalaryModal(false)}
                className="p-2 hover:bg-navy-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-navy-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-navy-700">Select Salary Component *</label>
                <select
                  className="premium-input w-full"
                  value={selectedSalaryMaster?.id || ''}
                  onChange={(e) => {
                    const master = salaryMasters.find((sm: SalaryMaster) => sm.id === e.target.value);
                    setSelectedSalaryMaster(master || null);
                    setCustomAmount(master?.defaultAmount?.toString() || '');
                  }}
                >
                  <option value="">Choose a salary component...</option>
                  {salaryMasters.map((master: SalaryMaster) => (
                    <option key={master.id} value={master.id}>
                      {master.name} ({master.code}) - {master.type}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSalaryMaster && (
                <>
                  <div className="p-3 bg-navy-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        selectedSalaryMaster.type === 'earning' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {selectedSalaryMaster.type.toUpperCase()}
                      </div>
                      <span className="text-xs text-navy-600">
                        {selectedSalaryMaster.calculationType}
                      </span>
                    </div>
                    <p className="text-sm text-navy-700">{selectedSalaryMaster.description}</p>
                    <p className="text-xs text-navy-500 mt-1">
                      Default: {selectedSalaryMaster.calculationType === 'percentage' 
                        ? `${selectedSalaryMaster.defaultAmount || 0}%` 
                        : `₹${(selectedSalaryMaster.defaultAmount || 0).toLocaleString('en-IN')}`
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-navy-700">
                      Amount ({selectedSalaryMaster.calculationType === 'percentage' ? '%' : '₹'}) *
                    </label>
                    <input
                      type="number"
                      placeholder={selectedSalaryMaster.defaultAmount?.toString() || '0.00'}
                      className="premium-input w-full"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSalaryModal(false)}
                className="flex-1 btn-premium-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSalaryComponent}
                className="flex-1 btn-premium-primary flex items-center justify-center gap-2"
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
