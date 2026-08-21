import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Check, User, Calendar, Briefcase, 
  DollarSign, Clock, Plus, X, ChevronRight, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { useToastStore } from '../../../../stores/toastStore';
import { 
  fetchStaff, saveContract, fetchSalaryMasters, 
  fetchContractGroups, fetchContractTypes, fetchShifts, 
  fetchWorkWeeks, fetchHolidayTemplates, fetchLeaveTypes, fetchHolidays 
} from '../../../../services/api';
import { ContractStatus } from '../../types';

const normalizeDateStr = (str?: string): string => {
  if (!str) return '';
  const s = str.trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  return s;
};

const formatDateForDisplay = (str?: string): string => {
  if (!str) return '';
  const norm = normalizeDateStr(str);
  const parts = norm.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return str;
};

const WIZARD_STEPS = [
  { id: 1, key: 'basic', label: 'Basic Info' },
  { id: 2, key: 'timeline', label: 'Timeline & Policies' },
  { id: 3, key: 'financials', label: 'Financials' },
  { id: 4, key: 'leaves', label: 'Leave & Employee Config' },
  { id: 5, key: 'schedule', label: 'Work Schedule' },
  { id: 6, key: 'review', label: 'Review & Finish' },
];

const DEFAULT_LEAVE_TYPES = [
  { id: 'leave_comp', name: 'Compensation leave', code: 'COMP', daysAllowed: 5, isPaid: true },
  { id: 'leave_driving', name: 'Driving Leave', code: 'DRV', daysAllowed: 3, isPaid: true },
  { id: 'leave_lwp', name: 'Leave Without Paid', code: 'LWP', daysAllowed: 30, isPaid: false },
  { id: 'leave_paid', name: 'Paid leave', code: 'PL', daysAllowed: 12, isPaid: true },
  { id: 'leave_short', name: 'Short Leave', code: 'SL', daysAllowed: 12, maxMonthly: 1, note: 'Max monthly: 1', isPaid: true },
  { id: 'leave_casual', name: 'Casual Leave', code: 'CL', daysAllowed: 7, isPaid: true },
  { id: 'leave_sick', name: 'Sick Leave', code: 'SL', daysAllowed: 7, isPaid: true },
  { id: 'leave_annual', name: 'Annual Leave', code: 'AL', daysAllowed: 15, isPaid: true },
];

const DEFAULT_HOLIDAYS = [
  { id: 'hol_1', occasionName: 'Bhaibij', name: 'Bhaibij', occasionType: 'Festival' },
  { id: 'hol_2', occasionName: 'Dashera', name: 'Dashera', occasionType: 'Festival' },
  { id: 'hol_3', occasionName: 'Dhuleti', name: 'Dhuleti', occasionType: 'Festival' },
  { id: 'hol_4', occasionName: 'Diwali', name: 'Diwali', occasionType: 'Festival' },
  { id: 'hol_5', occasionName: 'Ganesh Visarjan', name: 'Ganesh Visarjan', occasionType: 'Festival' },
  { id: 'hol_6', occasionName: 'Independence Day - 15th August', name: 'Independence Day - 15th August', occasionType: 'National' },
  { id: 'hol_7', occasionName: 'Janmashtami', name: 'Janmashtami', occasionType: 'Festival' },
  { id: 'hol_8', occasionName: 'Republic Day - 26th January', name: 'Republic Day - 26th January', occasionType: 'National' },
  { id: 'hol_9', occasionName: 'Gandhi Jayanti - 2nd October', name: 'Gandhi Jayanti - 2nd October', occasionType: 'National' },
  { id: 'hol_10', occasionName: 'New Year Day', name: 'New Year Day', occasionType: 'National' },
];

const DEFAULT_CONTRACT_TYPES = [
  {
    id: 1,
    name: 'Full-Time Employment',
    code: 'CT-FTE',
    description: 'Standard full-time employment contract',
    isActive: true,
    requiredDocuments: [
      { id: 1, templateName: 'Standard Full-Time Agreement', version: '1.0' },
      { id: 2, templateName: 'Executive Stylist Agreement', version: '2.0' }
    ]
  },
  {
    id: 2,
    name: 'Part-Time Employment',
    code: 'CT-PTE',
    description: 'Part-time employment contract',
    isActive: true,
    requiredDocuments: [
      { id: 3, templateName: 'Part-Time Flexible Agreement', version: '1.0' }
    ]
  }
];

const ContractFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Master options
  const [staffList, setStaffList] = useState<any[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [contractTypesList, setContractTypesList] = useState<any[]>(DEFAULT_CONTRACT_TYPES);
  const [salaryMasters, setSalaryMasters] = useState<any[]>([]);
  const [shiftsList, setShiftsList] = useState<any[]>([]);
  const [workWeeksList, setWorkWeeksList] = useState<any[]>([]);
  const [leaveTypesList, setLeaveTypesList] = useState<any[]>(DEFAULT_LEAVE_TYPES);
  const [holidaysList, setHolidaysList] = useState<any[]>(DEFAULT_HOLIDAYS);

  // Salary modal state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedSalaryMaster, setSelectedSalaryMaster] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<any>({
    code: 'CON-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    title: 'Job Contract',
    employeeId: '',
    groupId: '',
    typeId: '1',
    templateId: '1',
    isExistingEmployee: false,
    
    // Step 2: Timeline
    startDate: '2024-12-18',
    endDate: '2026-12-18',
    probationPeriodMonths: 0,
    noticePeriodDays: 30,

    // Step 3: Financials
    allowOvertime: false,
    salaryComponents: [],

    // Step 4: Leaves & Holidays
    selectedLeaves: ['leave_annual', 'leave_casual', 'leave_sick', 'leave_paid', 'leave_comp', 'leave_lwp', 'leave_short'],
    leaveCounts: {
      'leave_annual': 12,
      'leave_casual': 8,
      'leave_sick': 14,
      'leave_paid': 12,
      'leave_comp': 5,
      'leave_driving': 3,
      'leave_lwp': 30,
      'leave_short': 12
    },
    selectedHolidays: ['hol_1', 'hol_2', 'hol_3', 'hol_4', 'hol_5', 'hol_6', 'hol_7'],

    // Step 5: Schedule
    shiftId: '',
    workWeekId: '',
    status: ContractStatus.ACTIVE,
  });

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [staff, groups, cTypes, shifts, wWeeks, salaryComps, hTemplates, leaves, holidaysData] = await Promise.all([
          fetchStaff(),
          fetchContractGroups(),
          fetchContractTypes(),
          fetchShifts(),
          fetchWorkWeeks(),
          fetchSalaryMasters(),
          fetchHolidayTemplates(),
          fetchLeaveTypes(),
          fetchHolidays()
        ]);

        const DEFAULT_SALARY_MASTERS = [
          { id: 'sal_basic', name: 'Basic Salary', code: 'BASIC', type: 'earning', calculationType: 'fixed', defaultAmount: 25000 },
          { id: 'sal_hra', name: 'House Rent Allowance (HRA)', code: 'HRA', type: 'earning', calculationType: 'percentage', defaultAmount: 40 },
          { id: 'sal_special', name: 'Special Allowance', code: 'SPECIAL', type: 'earning', calculationType: 'fixed', defaultAmount: 5000 },
          { id: 'sal_conveyance', name: 'Conveyance Allowance', code: 'CONV', type: 'earning', calculationType: 'fixed', defaultAmount: 1600 },
          { id: 'sal_bonus', name: 'Performance Bonus', code: 'BONUS', type: 'earning', calculationType: 'fixed', defaultAmount: 3000 },
          { id: 'sal_pf', name: 'Provident Fund (PF)', code: 'PF', type: 'deduction', calculationType: 'percentage', defaultAmount: 12 },
          { id: 'sal_prof_tax', name: 'Professional Tax (PT)', code: 'PT', type: 'deduction', calculationType: 'fixed', defaultAmount: 200 },
          { id: 'sal_tds', name: 'Tax Deducted at Source (TDS)', code: 'TDS', type: 'deduction', calculationType: 'percentage', defaultAmount: 10 },
          { id: 'sal_esi', name: 'Employee State Insurance (ESI)', code: 'ESI', type: 'deduction', calculationType: 'percentage', defaultAmount: 1.75 },
        ];

        if (staff && staff.length > 0) setStaffList(staff);
        if (groups && groups.length > 0) setGroupsList(groups);

        if (cTypes && cTypes.length > 0) {
          setContractTypesList(cTypes);
          const defaultTypeId = String(cTypes[0].id);
          const firstTplId = cTypes[0].requiredDocuments?.[0]?.id ? String(cTypes[0].requiredDocuments[0].id) : '1';
          setFormData((prev: any) => ({
            ...prev,
            typeId: prev.typeId || defaultTypeId,
            templateId: prev.templateId || firstTplId
          }));
        } else {
          setContractTypesList(DEFAULT_CONTRACT_TYPES);
        }

        if (shifts && shifts.length > 0) setShiftsList(shifts);
        if (wWeeks && wWeeks.length > 0) setWorkWeeksList(wWeeks);
        if (salaryComps && salaryComps.length > 0) setSalaryMasters(salaryComps);
        else setSalaryMasters(DEFAULT_SALARY_MASTERS);

        if (leaves && leaves.length > 0) setLeaveTypesList(leaves);
        else setLeaveTypesList(DEFAULT_LEAVE_TYPES);

        if (holidaysData && holidaysData.length > 0) setHolidaysList(holidaysData);
        else setHolidaysList(DEFAULT_HOLIDAYS);

      } catch (err) {
        console.error('Error loading contract masters:', err);
        setContractTypesList(DEFAULT_CONTRACT_TYPES);
        setSalaryMasters(DEFAULT_SALARY_MASTERS);
        setLeaveTypesList(DEFAULT_LEAVE_TYPES);
        setHolidaysList(DEFAULT_HOLIDAYS);
      }
    };
    loadMasters();
  }, []);

  // Sync query parameters (groupId, employeeId) dynamically
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlGroupId = params.get('groupId');
    const urlEmployeeId = params.get('employeeId');

    if (urlGroupId && groupsList.length > 0) {
      const foundGroup = groupsList.find(g => String(g.id) === String(urlGroupId));
      if (foundGroup) {
        setFormData((prev: any) => ({
          ...prev,
          groupId: foundGroup.id,
          employeeId: urlEmployeeId || foundGroup.employeeId || prev.employeeId
        }));
      } else {
        setFormData((prev: any) => ({ ...prev, groupId: urlGroupId }));
      }
    } else if (urlGroupId) {
      setFormData((prev: any) => ({ ...prev, groupId: urlGroupId }));
    }

    if (urlEmployeeId) {
      setFormData((prev: any) => ({ ...prev, employeeId: urlEmployeeId }));
    }
  }, [location.search, groupsList, staffList]);

  // Derive target group and target employee dynamically
  const selectedGroup = groupsList.find(g => String(g.id) === String(formData.groupId));
  
  const targetEmployeeId = formData.employeeId || selectedGroup?.employeeId;
  const matchedStaff = staffList.find(s => String(s.id) === String(targetEmployeeId));

  const selectedEmployee = {
    name: matchedStaff?.name || selectedGroup?.employeeName || 'Selected Employee',
    biometricCode: matchedStaff?.biometricCode || matchedStaff?.employeeCode || selectedGroup?.employeeCode || '42',
    employeeCode: matchedStaff?.employeeCode || selectedGroup?.employeeCode || 'EMP001'
  };

  // Derive target contract type and templates from master
  const selectedContractType = contractTypesList.find(ct => String(ct.id) === String(formData.typeId));

  const availableTemplates = selectedContractType?.requiredDocuments && selectedContractType.requiredDocuments.length > 0
    ? selectedContractType.requiredDocuments
    : contractTypesList.flatMap((ct: any) => ct.requiredDocuments || []);

  // Sync contract start/end dates to stay within selected Contract Group date bounds
  useEffect(() => {
    if (selectedGroup) {
      const gStart = normalizeDateStr(selectedGroup.startDate);
      const gEnd = normalizeDateStr(selectedGroup.endDate);
      
      setFormData((prev: any) => {
        let curStart = normalizeDateStr(prev.startDate);
        let curEnd = normalizeDateStr(prev.endDate);

        if (gStart && (!curStart || curStart < gStart)) {
          curStart = gStart;
        }
        if (gEnd && curStart > gEnd) {
          curStart = gStart;
        }
        if (gEnd && (!curEnd || curEnd > gEnd)) {
          curEnd = gEnd;
        }
        if (curEnd && curEnd < curStart) {
          curEnd = curStart;
        }

        return {
          ...prev,
          startDate: curStart || prev.startDate,
          endDate: curEnd || prev.endDate
        };
      });
    }
  }, [selectedGroup?.id, selectedGroup?.startDate, selectedGroup?.endDate]);

  // Validation function for step navigation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!formData.typeId) {
        toast.error('Please select a Contract Type.');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.startDate) {
        toast.error('Please select a Start Date.');
        return false;
      }

      const groupStart = normalizeDateStr(selectedGroup?.startDate);
      const groupEnd = normalizeDateStr(selectedGroup?.endDate);
      const contractStart = normalizeDateStr(formData.startDate);
      const contractEnd = normalizeDateStr(formData.endDate);

      if (groupStart && contractStart < groupStart) {
        toast.error(`Start Date (${formatDateForDisplay(contractStart)}) cannot be before Contract Group start date (${formatDateForDisplay(groupStart)}).`);
        return false;
      }

      if (groupEnd && contractStart > groupEnd) {
        toast.error(`Start Date (${formatDateForDisplay(contractStart)}) cannot be after Contract Group end date (${formatDateForDisplay(groupEnd)}).`);
        return false;
      }

      if (contractEnd) {
        if (contractEnd < contractStart) {
          toast.error('End Date cannot be before Start Date.');
          return false;
        }
        if (groupEnd && contractEnd > groupEnd) {
          toast.error(`End Date (${formatDateForDisplay(contractEnd)}) cannot be after Contract Group end date (${formatDateForDisplay(groupEnd)}).`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handleAddSalaryComponent = () => {
    if (!selectedSalaryMaster || !customAmount) {
      toast.error('Please select a component and enter an amount');
      return;
    }
    const exists = formData.salaryComponents.some((c: any) => c.masterId === selectedSalaryMaster.id || c.name === selectedSalaryMaster.name);
    if (exists) {
      toast.error('This salary component is already mapped');
      return;
    }

    const component = {
      id: `comp_${Date.now()}`,
      masterId: selectedSalaryMaster.id,
      name: selectedSalaryMaster.name,
      code: selectedSalaryMaster.code || 'COMP',
      type: String(selectedSalaryMaster.type).toLowerCase() === 'deduction' ? 'deduction' : 'earning',
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
    toast.success('Component unmapped');
  };

  const totalEarnings = formData.salaryComponents
    .filter((c: any) => String(c.type).toLowerCase() === 'earning')
    .reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);

  const totalDeductions = formData.salaryComponents
    .filter((c: any) => String(c.type).toLowerCase() === 'deduction')
    .reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);

  const totalSalary = Math.max(0, totalEarnings - totalDeductions);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveContract(formData);
      toast.success('Contract created successfully!');
      navigate('/contracts/list');
    } catch (err) {
      toast.error('Failed to save contract');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ── Persistent Top Employee Profile Banner ── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {selectedEmployee.name}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Biometric Code: {selectedEmployee.biometricCode || selectedEmployee.employeeCode || '51'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
              Contract Group
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {selectedGroup?.name || 'Contract Group'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Wizard Stepper Bar ── */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto py-1">
            {WIZARD_STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div 
                  key={step.id} 
                  onClick={() => setCurrentStep(step.id)}
                  className="flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted 
                      ? 'bg-emerald-500 text-white' 
                      : isCurrent 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className={`text-xs font-semibold transition-colors ${
                    isCurrent ? 'text-blue-600 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                  {step.id < WIZARD_STEPS.length && (
                    <div className="w-6 h-0.5 bg-slate-200 mx-1 hidden md:block" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            )}
            {currentStep < 6 ? (
              <button
                onClick={handleNextStep}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Finalize & Create'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Wizard Step Content ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-8 space-y-8">
          
          {/* STEP 1: BASIC INFO (Image 2) */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Basic Information</h3>
                <p className="text-xs text-slate-500">Select the employee and contract type.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                
                {/* Employee field (read only if group context) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Employee <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${selectedEmployee.name} (from group)`}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none cursor-not-allowed text-xs"
                  />
                </div>

                {/* Contract Group field */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Contract Group
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  >
                    {groupsList.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contract Type */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Contract Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.typeId}
                    onChange={(e) => {
                      const newTypeId = e.target.value;
                      const matchingType = contractTypesList.find((ct: any) => String(ct.id) === String(newTypeId));
                      const firstTplId = matchingType?.requiredDocuments?.[0]?.id ? String(matchingType.requiredDocuments[0].id) : '';
                      setFormData((prev: any) => ({
                        ...prev,
                        typeId: newTypeId,
                        templateId: firstTplId || prev.templateId
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer"
                    required
                  >
                    <option value="">Select contract type from master...</option>
                    {contractTypesList.map((ct: any) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name} ({ct.code || 'CT'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contract Template */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Contract Template <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.templateId}
                    onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer"
                    required
                  >
                    <option value="">Select template from master...</option>
                    {availableTemplates.map((tpl: any) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.templateName || tpl.name || 'Contract Template'} {tpl.version ? `(v${tpl.version})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkbox: This is an existing employee */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.isExistingEmployee}
                    onChange={(e) => setFormData({ ...formData, isExistingEmployee: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">This is an existing employee</span>
                    <span className="text-[11px] text-slate-400 block">Check this if the employee has worked before and has previous leave balances</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: TIMELINE & POLICIES (Image 3) */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Timeline & Policies</h3>
                <p className="text-xs text-slate-500">Define contract dates and company policies.</p>
              </div>

              {/* Informational Banner showing Contract Group Date boundaries */}
              {selectedGroup && (selectedGroup.startDate || selectedGroup.endDate) && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 font-medium shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Contract dates must be between <strong>{formatDateForDisplay(selectedGroup.startDate)}</strong> and <strong>{formatDateForDisplay(selectedGroup.endDate) || 'Ongoing'}</strong> (inclusive) as defined by Contract Group <strong>({selectedGroup.name})</strong>.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    min={normalizeDateStr(selectedGroup?.startDate)}
                    max={normalizeDateStr(selectedGroup?.endDate)}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-medium text-slate-800 focus:ring-2 outline-none text-xs ${
                      (selectedGroup?.startDate && normalizeDateStr(formData.startDate) < normalizeDateStr(selectedGroup.startDate)) ||
                      (selectedGroup?.endDate && normalizeDateStr(formData.startDate) > normalizeDateStr(selectedGroup.endDate))
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {selectedGroup?.startDate && normalizeDateStr(formData.startDate) < normalizeDateStr(selectedGroup.startDate) && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">
                      ⚠️ Start date cannot be before {formatDateForDisplay(selectedGroup.startDate)}
                    </p>
                  )}
                  {selectedGroup?.endDate && normalizeDateStr(formData.startDate) > normalizeDateStr(selectedGroup.endDate) && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">
                      ⚠️ Start date cannot be after {formatDateForDisplay(selectedGroup.endDate)}
                    </p>
                  )}
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={normalizeDateStr(formData.startDate) || normalizeDateStr(selectedGroup?.startDate)}
                    max={normalizeDateStr(selectedGroup?.endDate)}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-medium text-slate-800 focus:ring-2 outline-none text-xs ${
                      selectedGroup?.endDate && normalizeDateStr(formData.endDate) > normalizeDateStr(selectedGroup.endDate)
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-blue-500'
                    }`}
                  />
                  {selectedGroup?.endDate && normalizeDateStr(formData.endDate) > normalizeDateStr(selectedGroup.endDate) && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">
                      ⚠️ End date cannot exceed Contract Group end date ({formatDateForDisplay(selectedGroup.endDate)})
                    </p>
                  )}
                </div>

                {/* Probation Period (Months) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Probation Period (Months)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={formData.probationPeriodMonths}
                    onChange={(e) => setFormData({ ...formData, probationPeriodMonths: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formData.probationPeriodMonths === 0 ? 'Probation: OFF' : `Probation: ${formData.probationPeriodMonths} Months`}
                  </span>
                </div>

                {/* Notice Period (days) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Notice Period (days) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 30"
                    value={formData.noticePeriodDays}
                    onChange={(e) => setFormData({ ...formData, noticePeriodDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINANCIALS (Image 4) */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Financial Details</h3>
                <p className="text-xs text-slate-500">Configure salary components and overtime settings.</p>
              </div>

              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs self-start cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Salary Components
                </button>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.allowOvertime}
                    onChange={(e) => setFormData({ ...formData, allowOvertime: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  Allow Overtime Work
                </label>
              </div>

              {/* Mapped Salary Components List */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800">Mapped Salary Components ({formData.salaryComponents.length})</h4>
                {formData.salaryComponents.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-slate-400 italic">
                    No salary components mapped yet. Click <strong>+ Add Salary Components</strong> above to map Earnings and Deductions.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.salaryComponents.map((comp: any) => {
                      const isEarning = String(comp.type).toLowerCase() === 'earning';
                      return (
                        <div key={comp.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isEarning ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isEarning ? 'EARNING' : 'DEDUCTION'}
                            </span>
                            <div>
                              <span className="font-bold text-slate-800">{comp.name}</span>
                              <span className="text-slate-400 text-[11px] ml-2">({comp.code || 'COMP'})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className={`font-bold text-xs ${isEarning ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isEarning ? '+' : '-'} ₹{Number(comp.amount || 0).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSalaryComponent(comp.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Remove component"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Salary Summary Table */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-200/80 text-xs font-medium">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Total Earnings</span>
                  <span className="font-bold text-emerald-700 text-sm">+ ₹{totalEarnings.toLocaleString()}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Total Deductions</span>
                  <span className="font-bold text-rose-600 text-sm">- ₹{totalDeductions.toLocaleString()}</span>
                </div>
                <div className="p-4 flex items-center justify-between bg-blue-50/50 font-bold">
                  <span className="text-slate-800">Total Salary (Net Payout)</span>
                  <span className="text-base text-blue-900 font-extrabold">₹{totalSalary.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: LEAVE & EMPLOYEE CONFIG (Image 5) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Leave & Holiday Configuration</h3>
                <p className="text-xs text-slate-500">Configure leave types and holidays for this contract.</p>
              </div>

              {/* 2-Column Split: Leave Types & Holidays */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
                
                {/* Left Column: Leave Types */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800">Leave Types ({leaveTypesList.length})</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {leaveTypesList.map((leave) => {
                      const isChecked = formData.selectedLeaves.includes(leave.id);
                      const currentCount = formData.leaveCounts?.[leave.id] ?? leave.daysAllowed ?? 12;

                      return (
                        <div 
                          key={leave.id}
                          onClick={() => {
                            setFormData((prev: any) => ({
                              ...prev,
                              selectedLeaves: isChecked 
                                ? prev.selectedLeaves.filter((id: string) => id !== leave.id)
                                : [...prev.selectedLeaves, leave.id]
                            }));
                          }}
                          className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isChecked ? 'bg-white border-blue-500/80 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <span className="font-semibold text-slate-800">{leave.name}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            {isChecked ? (
                              <div 
                                className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-2xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input 
                                  type="number"
                                  min={0}
                                  max={365}
                                  value={currentCount}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      leaveCounts: {
                                        ...(prev.leaveCounts || {}),
                                        [leave.id]: val
                                      }
                                    }));
                                  }}
                                  className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-[11px] text-slate-500 font-medium">days/yr</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-normal">
                                ({leave.daysAllowed || 12} days/yr)
                              </span>
                            )}

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              leave.isPaid !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {leave.note ? leave.note : (leave.isPaid !== false ? 'Paid' : 'Unpaid')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Holidays */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800">Holidays ({holidaysList.length})</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = holidaysList.map(h => h.id);
                        const isAllSelected = formData.selectedHolidays.length === allIds.length;
                        setFormData((prev: any) => ({
                          ...prev,
                          selectedHolidays: isAllSelected ? [] : allIds
                        }));
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {holidaysList.map((hol, idx) => {
                      const isChecked = formData.selectedHolidays.includes(hol.id);
                      const holidayTitle = hol.occasionName || hol.name;
                      return (
                        <div
                          key={hol.id}
                          onClick={() => {
                            setFormData((prev: any) => ({
                              ...prev,
                              selectedHolidays: isChecked
                                ? prev.selectedHolidays.filter((id: string) => id !== hol.id)
                                : [...prev.selectedHolidays, hol.id]
                            }));
                          }}
                          className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                            isChecked ? 'bg-white border-blue-500/80 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-semibold text-[11px] w-4">{idx + 1}.</span>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 accent-blue-600"
                            />
                            <span className="font-semibold text-slate-800">{holidayTitle}</span>
                          </div>
                          {(hol.occasionType || hol.type) && (
                            <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">
                              {hol.occasionType || hol.type}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 5: WORK SCHEDULE */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Work Schedule</h3>
                <p className="text-xs text-slate-500">Configure shift pattern and operational work week.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">Select Operational Shift *</label>
                  <select
                    value={formData.shiftId}
                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  >
                    <option value="">Select Operational Shift...</option>
                    {shiftsList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.startTime || '09:00'} - {s.endTime || '18:00'})</option>
                    ))}
                    {shiftsList.length === 0 && <option value="shift_std">Standard Day Shift (09:00 - 18:00)</option>}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">Select Work Week *</label>
                  <select
                    value={formData.workWeekId}
                    onChange={(e) => setFormData({ ...formData, workWeekId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  >
                    <option value="">Select Work Week...</option>
                    {workWeeksList.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                    {workWeeksList.length === 0 && <option value="ww_std">Standard 6-Day Work Week</option>}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & FINISH */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review & Finish</h3>
                <p className="text-xs text-slate-500">Review contract configuration before final creation.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-xs font-medium">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Employee</span>
                  <span className="font-bold text-slate-900">{selectedEmployee.name} ({selectedEmployee.biometricCode || '51'})</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Contract Group</span>
                  <span className="font-bold text-slate-900">{selectedGroup.name}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Validity Period</span>
                  <span className="font-bold text-slate-900">{formData.startDate} to {formData.endDate}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Notice Period</span>
                  <span className="font-bold text-slate-900">{formData.noticePeriodDays} Days</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Selected Leaves & Holidays</span>
                  <span className="font-bold text-slate-900">{formData.selectedLeaves.length} Leaves • {formData.selectedHolidays.length} Holidays</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Contract Status</span>
                  <span className="font-bold text-emerald-700 px-2.5 py-0.5 bg-emerald-100 rounded-full text-[11px] uppercase tracking-wider">
                    {formData.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Step Navigation Bar */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
            ) : <div />}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Finalize & Activate Contract'}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Salary Mapping Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Map Salary Component</h3>
              <button onClick={() => setShowSalaryModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Salary Component</label>
                <select
                  value={selectedSalaryMaster?.id || ''}
                  onChange={(e) => {
                    const found = salaryMasters.find(s => String(s.id) === String(e.target.value));
                    setSelectedSalaryMaster(found || null);
                    if (found?.defaultAmount) {
                      setCustomAmount(String(found.defaultAmount));
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Choose Component...</option>
                  {salaryMasters.map((master: any) => (
                    <option key={master.id} value={master.id}>
                      {master.name} ({master.code || 'COMP'}) — {String(master.type || 'earning').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowSalaryModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button onClick={handleAddSalaryComponent} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl">
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
