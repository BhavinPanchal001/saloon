import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Check, User, Calendar, Briefcase, 
  DollarSign, Clock, Plus, X, ChevronRight, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { useToastStore } from '../../../../stores/toastStore';
import { 
  fetchStaff, saveContract, fetchContractById, fetchContracts,
  fetchContractGroups, fetchContractTypes, fetchShifts, 
  fetchWorkWeeks, fetchHolidayTemplates, fetchLeaveTypes, fetchHolidays 
} from '../../../../services/api';
import { ContractStatus } from '../../types';
import { findContractConflicts, revisionCandidates, previousContractEnd } from '../../../../../shared/contractOverlap.js';

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
  { id: 3, key: 'overtime', label: 'Overtime' },
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
  const contractId = new URLSearchParams(location.search).get('id');
  const revisionId = new URLSearchParams(location.search).get('reviseFrom');
  const sourceId = contractId || revisionId;
  const [isLoadingContract, setIsLoadingContract] = useState(Boolean(sourceId));
  const [contractLoadError, setContractLoadError] = useState('');
  const [editRequiresRevision, setEditRequiresRevision] = useState(false);
  useEffect(() => {
    if (!sourceId) return;
    let cancelled = false;
    setCurrentStep(1);
    setIsLoadingContract(true);
    setContractLoadError('');
    fetchContractById(sourceId).then(data => {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const revisionStart = today > data.startDate && (!data.endDate || today <= data.endDate) ? today : '';
      if (!cancelled) setEditRequiresRevision(Boolean(contractId && data.status === ContractStatus.ACTIVE && data.startDate <= today));
      if (!cancelled) setFormData((previous: any) => ({
        ...previous, ...data,
        ...(revisionId ? { id: undefined, code: '', previousContractId: data.id, previousContractCode: data.code, previousStartDate: data.startDate, currentVersion: Number(data.currentVersion || 1) + 1, startDate: revisionStart, endDate: data.endDate || '', groupId: data.groupId || '', status: ContractStatus.ACTIVE } : {}),
        selectedLeaves: data.selectedLeaves || [], selectedHolidays: data.selectedHolidays || [], leaveCounts: data.leaveCounts || {},
        allowOvertime: Boolean(data.overtime?.enabled),
        probationPeriodMonths: data.probationPeriodMonths ?? 0, noticePeriodDays: data.noticePeriodDays ?? 30,
      }));
    }).catch(error => { if (!cancelled) setContractLoadError(error.message || 'Unable to load contract.'); })
      .finally(() => { if (!cancelled) setIsLoadingContract(false); });
    return () => { cancelled = true; };
  }, [sourceId, revisionId]);

  // Master options
  const [staffList, setStaffList] = useState<any[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [contractTypesList, setContractTypesList] = useState<any[]>(DEFAULT_CONTRACT_TYPES);
  const [shiftsList, setShiftsList] = useState<any[]>([]);
  const [workWeeksList, setWorkWeeksList] = useState<any[]>([]);
  const [leaveTypesList, setLeaveTypesList] = useState<any[]>([]);
  const [holidaysList, setHolidaysList] = useState<any[]>([]);

  const [existingContracts, setExistingContracts] = useState<any[]>([]);
  const [contractsLoaded, setContractsLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchContracts().then(data => { if (!cancelled) { setExistingContracts(data); setContractsLoaded(true); } })
      .catch(() => { if (!cancelled) toast.error('Unable to check existing contracts. Reload before saving.'); });
    return () => { cancelled = true; };
  }, []);

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

    // Step 4: Leaves & Holidays
    selectedLeaves: [],
    leaveCounts: {},
    selectedHolidays: [],

    // Step 5: Schedule
    shiftId: '',
    workWeekId: '',
    status: ContractStatus.ACTIVE,
  });

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [staff, groups, cTypes, shifts, wWeeks, hTemplates, leaves, holidaysData] = await Promise.all([
          fetchStaff(),
          fetchContractGroups(),
          fetchContractTypes(),
          fetchShifts(),
          fetchWorkWeeks(),
          fetchHolidayTemplates(),
          fetchLeaveTypes(),
          fetchHolidays()
        ]);

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

        if (leaves && leaves.length > 0) setLeaveTypesList(leaves);
        else setLeaveTypesList([]);

        if (holidaysData && holidaysData.length > 0) setHolidaysList(holidaysData);
        else setHolidaysList([]);

      } catch (err) {
        console.error('Error loading contract masters:', err);
        setContractTypesList(DEFAULT_CONTRACT_TYPES);
        setLeaveTypesList([]);
        toast.error('Unable to load contract settings. Reload before selecting leaves and holidays.');
        setHolidaysList([]);
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
  const dateConflicts = findContractConflicts(existingContracts, { ...formData, employeeId: targetEmployeeId });
  const eligibleRevisions = revisionCandidates(dateConflicts, formData.startDate);
  const unresolvedConflicts = dateConflicts.filter((contract: any) => String(contract.id) !== String(formData.previousContractId));
  const canContinueTimeline = () => {
    if (!contractsLoaded) { toast.error('Existing contracts could not be checked. Reload before saving.'); return false; }
    if (!contractId && unresolvedConflicts.length) {
      toast.error('These dates are already covered by an existing contract. Choose a non-overlapping date range.');
      return false;
    }
    return true;
  };
  useEffect(() => {
    if (revisionId || !formData.previousContractId) return;
    const predecessor = existingContracts.find(contract => String(contract.id) === String(formData.previousContractId));
    if (predecessor && String(predecessor.employeeId) !== String(targetEmployeeId)) setFormData((previous: any) => ({ ...previous, previousContractId: undefined, previousContractCode: '', previousStartDate: '', currentVersion: 1 }));
  }, [targetEmployeeId, formData.previousContractId, existingContracts, revisionId]);
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
        if (revisionId && !prev.startDate) return { ...prev, endDate: gEnd || prev.endDate };
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
      if (formData.previousContractId && !selectedGroup) { toast.error('Select a group covering the revision period.'); return false; }
      if (!formData.typeId) {
        toast.error('Please select a Contract Type.');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!canContinueTimeline()) return false;
      if (formData.previousContractId && formData.previousStartDate && formData.startDate && formData.startDate <= formData.previousStartDate) { toast.error('The effective date must be after the previous contract start date.'); return false; }
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

  const handleSave = async () => {
    if (isSaving || isLoadingContract || contractLoadError) return;
    if (editRequiresRevision) {
      toast.error('This contract has already started. Select Create Revision and choose an effective date.');
      return;
    }
    if (formData.previousContractId && !selectedGroup) {
      toast.error('Select a group covering the revision period.');
      setCurrentStep(1);
      return;
    }
    if (!canContinueTimeline()) { setCurrentStep(2); return; }
    setIsSaving(true);
    try {
      await saveContract(formData);
      if (formData.previousContractId) toast.success('Revision scheduled. The previous contract is preserved until the effective date.');
      if (!formData.previousContractId) toast.success(contractId ? 'Contract updated successfully!' : 'Contract created successfully!');
      navigate('/contracts/list');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save contract');
      if (/overlap/i.test(err.message || '')) {
        fetchContracts().then(data => { setExistingContracts(data); setContractsLoaded(true); }).catch(() => setContractsLoaded(false));
        setCurrentStep(2);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingContract) return <p role="status" className="p-8 text-slate-500">Loading contract for editing...</p>;
  if (contractLoadError) return <div role="alert" className="p-8"><p>{contractLoadError}</p><button type="button" onClick={() => navigate('/contracts/list')}>Back to Contracts</button></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {editRequiresRevision && <div role="alert" className="mx-auto w-full max-w-6xl p-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl"><p>This contract has already started. Create a revision with an effective date to save changes and preserve its history.</p><button type="button" className="mt-2 font-semibold underline" onClick={() => navigate(`/contracts/new?reviseFrom=${contractId}`)}>Create Revision</button></div>}
      {formData.previousContractId && <div className="mx-auto w-full max-w-6xl p-4 text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-xl"><strong>Revision of {formData.previousContractCode}</strong><p className="mt-1">Choose the effective start date and a contract group covering the new period. The previous contract ends the day before; earlier settings stay unchanged.</p></div>}
      
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
                {isSaving ? 'Saving...' : contractId ? 'Save Changes' : formData.previousContractId ? 'Schedule Revision' : 'Finalize & Create'}
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
                    aria-label="Contract Group"
                    value={formData.groupId || ''}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  >
                    <option value="">Select a contract group...</option>
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

              {!contractId && dateConflicts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" role="region" aria-label="Apply changes to an existing contract">
                  <h4 className="text-sm font-bold text-amber-900">An existing contract covers these dates</h4>
                  <p className="text-xs text-amber-800">Apply a revision to keep earlier dates under the previous terms.</p>
                  {eligibleRevisions.map((contract: any) => <label key={contract.id} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={String(formData.previousContractId) === String(contract.id)} onChange={event => setFormData((previous: any) => ({ ...previous, previousContractId: event.target.checked ? contract.id : undefined, previousContractCode: event.target.checked ? contract.code : '', previousStartDate: event.target.checked ? contract.startDate : '', currentVersion: event.target.checked ? Number(contract.currentVersion || 1) + 1 : 1, status: ContractStatus.ACTIVE }))} />
                    <span className="text-xs text-slate-700"><strong className="block text-sm">Apply as revision of {contract.code} from {formatDateForDisplay(formData.startDate)}</strong><span className="block mt-1">Previous terms apply through {formatDateForDisplay(previousContractEnd(formData.startDate))}. These new settings apply from {formatDateForDisplay(formData.startDate)}.</span></span>
                  </label>)}
                  {!eligibleRevisions.length && <p className="text-xs font-medium text-amber-900">Choose an effective date after the existing contract's start date to create a revision.</p>}
                  {formData.previousContractId && unresolvedConflicts.length > 0 && <p className="text-xs font-medium text-rose-700">Another contract also overlaps: {unresolvedConflicts.map((contract: any) => contract.code).join(', ')}. Adjust the end date to avoid that period.</p>}
                </div>
              )}

              {!contractId && unresolvedConflicts.length > 0 && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">An existing contract already covers these dates. Choose a date range that does not overlap.</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    {formData.previousContractId ? 'Effective From' : 'Start Date'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    aria-label={formData.previousContractId ? 'Effective From' : 'Start Date'}
                    value={formData.startDate}
                    min={normalizeDateStr(selectedGroup?.startDate)}
                    max={normalizeDateStr(selectedGroup?.endDate)}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-medium text-slate-800 focus:ring-2 outline-none text-xs ${
                      (formData.startDate && selectedGroup?.startDate && normalizeDateStr(formData.startDate) < normalizeDateStr(selectedGroup.startDate)) ||
                      (selectedGroup?.endDate && normalizeDateStr(formData.startDate) > normalizeDateStr(selectedGroup.endDate))
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {formData.startDate && selectedGroup?.startDate && normalizeDateStr(formData.startDate) < normalizeDateStr(selectedGroup.startDate) && (
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
                <h3 className="text-base font-bold text-slate-900">Overtime</h3>
                <p className="text-xs text-slate-500">Configure overtime settings.</p>
              </div>

              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-slate-800">Available Leave Types ({leaveTypesList.length})</h4><span className="text-xs font-semibold text-blue-600">{formData.selectedLeaves.length} selected</span></div>
                  {leaveTypesList.length === 0 && <p className="text-xs text-slate-500">No leave types available. Add them in Contract Masters, then reload.</p>}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {leaveTypesList.map((leave) => {
                      const isChecked = formData.selectedLeaves.some((id: any) => String(id) === String(leave.id));
                      const currentCount = formData.leaveCounts?.[leave.id] ?? leave.daysAllowed ?? 12;

                      return (
                        <div 
                          key={leave.id}
                          onClick={() => {
                            setFormData((prev: any) => ({
                              ...prev,
                              selectedLeaves: isChecked 
                                ? prev.selectedLeaves.filter((id: string) => String(id) !== String(leave.id))
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
                      const isChecked = formData.selectedHolidays.some((id: any) => String(id) === String(hol.id));
                      const holidayTitle = hol.occasionName || hol.name;
                      return (
                        <div
                          key={hol.id}
                          onClick={() => {
                            setFormData((prev: any) => ({
                              ...prev,
                              selectedHolidays: isChecked
                                ? prev.selectedHolidays.filter((id: string) => String(id) !== String(hol.id))
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
                  <span className="font-bold text-slate-900">{selectedGroup?.name || 'Select a contract group'}</span>
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

    </div>
  );
};

export default ContractFormPage;
