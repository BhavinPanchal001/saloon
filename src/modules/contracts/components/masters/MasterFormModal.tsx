import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash } from 'lucide-react';
import { 
  saveRole, saveShift, saveLeaveType, 
  saveWorkWeek, saveContractType, saveHolidayTemplate, 
  saveHoliday, saveSalaryMaster, fetchHolidayTemplates 
} from '../../../../services/api';
import { useToastStore } from '../../../../stores/toastStore';

interface MasterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterType: string;
  initialData?: any;
  onSave: (data: any) => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const MasterFormModal: React.FC<MasterFormModalProps> = ({ 
  isOpen, 
  onClose, 
  masterType, 
  initialData, 
  onSave 
}) => {
  const toast = useToastStore();
  const [loading, setLoading] = useState(false);
  const [holidayTab, setHolidayTab] = useState<'template' | 'occasion'>('template');
  const [holidayTemplates, setHolidayTemplates] = useState<any[]>([]);

  // Core fields state
  const [formData, setFormData] = useState<any>({});

  // Required docs helper state for Contract Types
  const [reqDocs, setReqDocs] = useState<any[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Load holiday templates if holidays master is selected
    if (masterType === 'holidays') {
      fetchHolidayTemplates().then(setHolidayTemplates).catch(console.error);
    }

    // Populate form data based on initialData or defaults
    if (initialData) {
      setFormData({ ...initialData });
      if (masterType === 'types' && initialData.requiredDocuments) {
        setReqDocs([...initialData.requiredDocuments]);
      }
      if (masterType === 'holidays') {
        setHolidayTab(initialData.templateId ? 'occasion' : 'template');
      }
    } else {
      // Default configurations
      if (masterType === 'roles') {
        setFormData({ name: '', description: '', isActive: true, isEmployee: true });
      } else if (masterType === 'shifts') {
        setFormData({ name: '', startTime: '09:00', endTime: '18:00', breakDuration: 60, gracePeriod: 15, isActive: true });
      } else if (masterType === 'leaves') {
        setFormData({ name: '', code: '', daysAllowed: 12, maxMonthly: 2, advanceNoticeDays: 7, isPaid: true, allowAnytime: true, allowHourly: false, hourlyHours: 0, neededDocument: false });
      } else if (masterType === 'workweeks') {
        setFormData({ name: '', operationalDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], isActive: true });
      } else if (masterType === 'types') {
        setFormData({ name: '', code: '', description: '', isActive: true });
        setReqDocs([]);
      } else if (masterType === 'holidays') {
        setFormData({ name: '', occasionName: '', type: 'National', description: '', isRecurring: true, isActive: true, startDate: '', endDate: '' });
      } else if (masterType === 'salary') {
        setFormData({ name: '', code: '', type: 'earning', calculationType: 'fixed', defaultAmount: 0, isActive: true });
      }
    }
  }, [isOpen, initialData, masterType]);

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  // Operational days toggler for Work Weeks
  const handleDayToggle = (day: string) => {
    const currentDays = formData.operationalDays || [];
    let nextDays = [];
    if (currentDays.includes(day)) {
      nextDays = currentDays.filter((d: string) => d !== day);
    } else {
      nextDays = [...currentDays, day];
    }
    handleFieldChange('operationalDays', nextDays);
  };

  // Document template management for Contract Types
  const handleAddDoc = () => {
    if (!newDocName.trim()) {
      toast.error('Please enter a document template name');
      return;
    }
    const doc = {
      templateName: newDocName,
      version: "1.0",
      templateContent: newDocContent || "<p>Agreement contents go here...</p>"
    };
    setReqDocs([...reqDocs, doc]);
    setNewDocName('');
    setNewDocContent('');
    toast.success('Document template added');
  };

  const handleRemoveDoc = (index: number) => {
    const nextDocs = reqDocs.filter((_, idx) => idx !== index);
    setReqDocs(nextDocs);
    toast.success('Document template removed');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let savedRecord = null;
      if (masterType === 'roles') {
        if (!formData.name) throw new Error('Role name is required');
        savedRecord = await saveRole(formData);
      } else if (masterType === 'shifts') {
        if (!formData.name) throw new Error('Shift name is required');
        savedRecord = await saveShift(formData);
      } else if (masterType === 'leaves') {
        if (!formData.name) throw new Error('Leave type name is required');
        savedRecord = await saveLeaveType(formData);
      } else if (masterType === 'workweeks') {
        if (!formData.name) throw new Error('Work week name is required');
        savedRecord = await saveWorkWeek(formData);
      } else if (masterType === 'types') {
        if (!formData.name) throw new Error('Contract type name is required');
        const payload = { ...formData, requiredDocuments: reqDocs };
        savedRecord = await saveContractType(payload);
      } else if (masterType === 'holidays') {
        if (holidayTab === 'template') {
          if (!formData.name) throw new Error('Template name is required');
          savedRecord = await saveHolidayTemplate(formData);
        } else {
          if (!formData.occasionName || !formData.templateId || !formData.startDate) {
            throw new Error('Occasion Name, Holiday Template and Start Date are required');
          }
          savedRecord = await saveHoliday(formData);
        }
      } else if (masterType === 'salary') {
        if (!formData.name) throw new Error('Salary component name is required');
        savedRecord = await saveSalaryMaster(formData);
      }

      toast.success('Master record saved successfully');
      onSave(savedRecord);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save master record');
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    switch (masterType) {
      case 'roles':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role Name*</label>
              <input 
                type="text" 
                placeholder="e.g. Senior Stylist" 
                className="premium-input w-full"
                value={formData.name || ''} 
                onChange={(e) => handleFieldChange('name', e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
              <textarea 
                rows={3} 
                placeholder="Describe role responsibilities..." 
                className="premium-input w-full"
                value={formData.description || ''} 
                onChange={(e) => handleFieldChange('description', e.target.value)} 
              />
            </div>
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isEmployee} 
                  onChange={() => handleCheckboxChange('isEmployee')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Is Salon Employee
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={() => handleCheckboxChange('isActive')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Is Active Role
              </label>
            </div>
          </div>
        );

      case 'shifts':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Name*</label>
              <input 
                type="text" 
                placeholder="e.g. Morning Shift" 
                className="premium-input w-full"
                value={formData.name || ''} 
                onChange={(e) => handleFieldChange('name', e.target.value)} 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time*</label>
                <input 
                  type="time" 
                  className="premium-input w-full"
                  value={formData.startTime || '09:00'} 
                  onChange={(e) => handleFieldChange('startTime', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time*</label>
                <input 
                  type="time" 
                  className="premium-input w-full"
                  value={formData.endTime || '18:00'} 
                  onChange={(e) => handleFieldChange('endTime', e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Break Duration (Min)</label>
                <input 
                  type="number" 
                  placeholder="60" 
                  className="premium-input w-full"
                  value={formData.breakDuration || ''} 
                  onChange={(e) => handleFieldChange('breakDuration', e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grace Period (Min)</label>
                <input 
                  type="number" 
                  placeholder="15" 
                  className="premium-input w-full"
                  value={formData.gracePeriod || ''} 
                  onChange={(e) => handleFieldChange('gracePeriod', e.target.value)} 
                />
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={() => handleCheckboxChange('isActive')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Is Active Shift
              </label>
            </div>
          </div>
        );

      case 'leaves':
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type Name*</label>
                <input 
                  type="text" 
                  placeholder="e.g. Annual Leave" 
                  className="premium-input w-full"
                  value={formData.name || ''} 
                  onChange={(e) => handleFieldChange('name', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Code*</label>
                <input 
                  type="text" 
                  placeholder="e.g. LV-ANN" 
                  className="premium-input w-full"
                  value={formData.code || ''} 
                  onChange={(e) => handleFieldChange('code', e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Yearly Allowance*</label>
                <input 
                  type="number" 
                  className="premium-input w-full"
                  value={formData.daysAllowed || 0} 
                  onChange={(e) => handleFieldChange('daysAllowed', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max Monthly Limit</label>
                <input 
                  type="number" 
                  className="premium-input w-full"
                  value={formData.maxMonthly || 0} 
                  onChange={(e) => handleFieldChange('maxMonthly', e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advance Notice (Days)</label>
                <input 
                  type="number" 
                  className="premium-input w-full"
                  value={formData.advanceNoticeDays || 0} 
                  onChange={(e) => handleFieldChange('advanceNoticeDays', e.target.value)} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isPaid} 
                  onChange={() => handleCheckboxChange('isPaid')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Is Paid Leave
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.neededDocument} 
                  onChange={() => handleCheckboxChange('neededDocument')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Requires Supporting Document
              </label>
            </div>
            <div className="h-px bg-slate-100 my-2" />
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.allowAnytime} 
                  onChange={() => handleCheckboxChange('allowAnytime')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Allow Anytime Request
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.allowHourly} 
                    onChange={() => handleCheckboxChange('allowHourly')}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                  />
                  Allow Hourly Leave Request?
                </label>
                {formData.allowHourly && (
                  <div className="pl-6 space-y-1">
                    <label className="text-xs text-slate-400 block">Take Hours</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 4 Hours limit" 
                      className="premium-input w-28"
                      value={formData.hourlyHours || ''} 
                      onChange={(e) => handleFieldChange('hourlyHours', e.target.value)} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'workweeks':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Week Name*</label>
              <input 
                type="text" 
                placeholder="e.g. Standard 6-Day Week" 
                className="premium-input w-full"
                value={formData.name || ''} 
                onChange={(e) => handleFieldChange('name', e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Operational Days*</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = (formData.operationalDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={() => handleCheckboxChange('isActive')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Is Active Schedule
              </label>
            </div>
          </div>
        );

      case 'types':
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contract Type Name*</label>
                <input 
                  type="text" 
                  placeholder="e.g. Full-Time Staff" 
                  className="premium-input w-full"
                  value={formData.name || ''} 
                  onChange={(e) => handleFieldChange('name', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Code*</label>
                <input 
                  type="text" 
                  placeholder="e.g. CT-FTE" 
                  className="premium-input w-full"
                  value={formData.code || ''} 
                  onChange={(e) => handleFieldChange('code', e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
              <textarea 
                rows={2} 
                placeholder="Brief description of contract terms..." 
                className="premium-input w-full"
                value={formData.description || ''} 
                onChange={(e) => handleFieldChange('description', e.target.value)} 
              />
            </div>

            <div className="h-px bg-slate-100 my-2" />

            {/* Premium Document Template Section (Quill-simulated editor inside Modal) */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Link Document Template</label>
                <p className="text-xs text-slate-400 mt-0.5">Specify templates and Quill agreement content for legal contracts.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Template Document Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Employment Offer Agreement" 
                    className="premium-input w-full"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Template Content (Quill Simulated HTML Editor)</label>
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-inner">
                    {/* Rich text formatting bar placeholder for premium aesthetics */}
                    <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 flex gap-2 text-xs font-bold text-slate-500">
                      <span className="hover:text-indigo-600 cursor-pointer">B</span>
                      <span className="hover:text-indigo-600 cursor-pointer">I</span>
                      <span className="hover:text-indigo-600 cursor-pointer">U</span>
                      <span className="h-4 w-px bg-slate-200" />
                      <span className="hover:text-indigo-600 cursor-pointer">H1</span>
                      <span className="hover:text-indigo-600 cursor-pointer">H2</span>
                      <span className="h-4 w-px bg-slate-200" />
                      <span className="hover:text-indigo-600 cursor-pointer">List</span>
                    </div>
                    <textarea 
                      rows={4} 
                      placeholder="<h3>Agreement Terms</h3><p>Enter Quill HTML content here...</p>" 
                      className="w-full p-3 bg-transparent text-sm font-mono border-none outline-none focus:ring-0 resize-y min-h-[100px]"
                      value={newDocContent}
                      onChange={(e) => setNewDocContent(e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleAddDoc}
                  className="btn-premium-outline w-full py-2 flex items-center justify-center gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Link Template Document
                </button>
              </div>

              {/* Linked docs list */}
              {reqDocs.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Linked Required Documents</label>
                  <div className="space-y-2">
                    {reqDocs.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                        <div>
                          <p className="text-sm font-bold text-indigo-900">{doc.templateName}</p>
                          <p className="text-xs text-indigo-500">Version: {doc.version} • HTML content loaded</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveDoc(idx)}
                          className="text-rose-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={() => handleCheckboxChange('isActive')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Is Active Contract Type
              </label>
            </div>
          </div>
        );

      case 'holidays':
        return (
          <div className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button 
                type="button" 
                onClick={() => setHolidayTab('template')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  holidayTab === 'template' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                1. Holiday Template
              </button>
              <button 
                type="button" 
                onClick={() => setHolidayTab('occasion')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  holidayTab === 'occasion' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                2. Holiday Master (Occasion)
              </button>
            </div>

            {holidayTab === 'template' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Template Name*</label>
                    <input 
                      type="text" 
                      placeholder="e.g. National Holidays 2026" 
                      className="premium-input w-full"
                      value={formData.name || ''} 
                      onChange={(e) => handleFieldChange('name', e.target.value)} 
                      required={holidayTab === 'template'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type*</label>
                    <select 
                      className="premium-input w-full"
                      value={formData.type || 'National'}
                      onChange={(e) => handleFieldChange('type', e.target.value)}
                    >
                      <option value="National">National</option>
                      <option value="Company">Company</option>
                      <option value="Religious">Religious</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={2} 
                    placeholder="Provide details about holiday rules..." 
                    className="premium-input w-full"
                    value={formData.description || ''} 
                    onChange={(e) => handleFieldChange('description', e.target.value)} 
                  />
                </div>
                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isRecurring} 
                      onChange={() => handleCheckboxChange('isRecurring')}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                    />
                    Is Recurring Annual Holiday
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActive} 
                      onChange={() => handleCheckboxChange('isActive')}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                    />
                    Is Active
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Holiday Template*</label>
                  <select 
                    className="premium-input w-full"
                    value={formData.templateId || ''}
                    onChange={(e) => handleFieldChange('templateId', e.target.value)}
                    required={holidayTab === 'occasion'}
                  >
                    <option value="">Choose a Template...</option>
                    {holidayTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occasion Name*</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Independence Day" 
                      className="premium-input w-full"
                      value={formData.occasionName || ''} 
                      onChange={(e) => handleFieldChange('occasionName', e.target.value)} 
                      required={holidayTab === 'occasion'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occasion Type*</label>
                    <select 
                      className="premium-input w-full"
                      value={formData.occasionType || 'National'}
                      onChange={(e) => handleFieldChange('occasionType', e.target.value)}
                    >
                      <option value="National">National</option>
                      <option value="Company">Company</option>
                      <option value="Religious">Religious</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date*</label>
                    <input 
                      type="date" 
                      className="premium-input w-full"
                      value={formData.startDate || ''} 
                      onChange={(e) => handleFieldChange('startDate', e.target.value)} 
                      required={holidayTab === 'occasion'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date*</label>
                    <input 
                      type="date" 
                      className="premium-input w-full"
                      value={formData.endDate || ''} 
                      onChange={(e) => handleFieldChange('endDate', e.target.value)} 
                      required={holidayTab === 'occasion'}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={2} 
                    placeholder="Occasion descriptions..." 
                    className="premium-input w-full"
                    value={formData.description || ''} 
                    onChange={(e) => handleFieldChange('description', e.target.value)} 
                  />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActive} 
                      onChange={() => handleCheckboxChange('isActive')}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                    />
                    Is Active Occasion
                  </label>
                </div>
              </div>
            )}
          </div>
        );

      case 'salary':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Component Name*</label>
                <input 
                  type="text" 
                  placeholder="e.g. Basic Salary" 
                  className="premium-input w-full"
                  value={formData.name || ''} 
                  onChange={(e) => handleFieldChange('name', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Code*</label>
                <input 
                  type="text" 
                  placeholder="e.g. SAL-BAS" 
                  className="premium-input w-full"
                  value={formData.code || ''} 
                  onChange={(e) => handleFieldChange('code', e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Component Type*</label>
                <select 
                  className="premium-input w-full"
                  value={formData.type || 'earning'}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                >
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calculation Mode*</label>
                <select 
                  className="premium-input w-full"
                  value={formData.calculationType || 'fixed'}
                  onChange={(e) => handleFieldChange('calculationType', e.target.value)}
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Default Value*</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  {formData.calculationType === 'percentage' ? '%' : 'INR '}
                </span>
                <input 
                  type="number" 
                  step="0.01" 
                  className="premium-input w-full pl-14"
                  value={formData.defaultAmount || 0} 
                  onChange={(e) => handleFieldChange('defaultAmount', e.target.value)} 
                  required
                />
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={() => handleCheckboxChange('isActive')}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" 
                />
                Is Active Salary Component
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {initialData ? 'Update' : 'Add New'} {
                masterType === 'types' ? 'Contract Type' : 
                masterType === 'leaves' ? 'Leave Type' : 
                masterType === 'workweeks' ? 'Work Week' :
                masterType === 'holidays' ? (holidayTab === 'template' ? 'Holiday Template' : 'Holiday Occasion') :
                masterType.charAt(0).toUpperCase() + masterType.slice(1).replace('s', '')
              }
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Define master records for employee contracts.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form className="p-8" onSubmit={handleFormSubmit}>
          {renderFields()}

          <div className="mt-8 flex gap-3">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterFormModal;
