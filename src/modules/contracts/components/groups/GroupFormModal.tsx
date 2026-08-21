import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Calendar } from 'lucide-react';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  staffList?: any[];
  onSave: (data: any) => void;
}

const GroupFormModal: React.FC<GroupFormModalProps> = ({ 
  isOpen, 
  onClose, 
  initialData, 
  staffList = [],
  onSave 
}) => {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmployeeId(initialData.employeeId || '');
      setDuration(initialData.duration || '');
      setStartDate(initialData.startDate || '');
      setEndDate(initialData.endDate || '');
      setStatus(initialData.status || 'Active');
      setDescription(initialData.description || '');
    } else {
      setName('');
      setEmployeeId('');
      setDuration('');
      setStartDate('');
      setEndDate('');
      setStatus('Active');
      setDescription('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !employeeId || !startDate) {
      alert('Please enter Group Name, Employee, and Start Date.');
      return;
    }

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      name,
      employeeId,
      duration,
      startDate,
      endDate,
      status,
      description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Close Button Top Right */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-slate-900 leading-snug">
            {initialData ? 'Edit Contract Group' : 'Create Contract Group'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Group multiple contracts under a single entity for an employee.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 text-xs">
          
          {/* Group Name */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Senior Developer Agreement 2025" 
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900 placeholder:text-slate-400 transition-all text-xs" 
              required
            />
          </div>

          {/* Employee Dropdown */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Employee <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  if (!name) {
                    const emp = staffList.find(s => s.id === e.target.value);
                    if (emp) setName(`${emp.name}'s Contract Group`);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900 appearance-none cursor-pointer transition-all text-xs"
                required
              >
                <option value="">Select an employee</option>
                {staffList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode || emp.role || 'Employee'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Duration Dropdown */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Duration (Optional)
            </label>
            <div className="relative">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900 appearance-none cursor-pointer transition-all text-xs"
              >
                <option value="">Select duration</option>
                <option value="6 Months">6 Months</option>
                <option value="12 Months">12 Months (1 Year)</option>
                <option value="24 Months">24 Months (2 Years)</option>
                <option value="36 Months">36 Months (3 Years)</option>
                <option value="60 Months">60 Months (5 Years)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900 transition-all text-xs" 
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                End Date
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900 transition-all text-xs" 
                />
              </div>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Status
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900 appearance-none cursor-pointer transition-all text-xs"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Description
            </label>
            <textarea 
              rows={3} 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes or details about this contract group..." 
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900 placeholder:text-slate-400 transition-all text-xs resize-none" 
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button 
              type="button"
              onClick={onClose} 
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {initialData ? 'Update Contract Group' : 'Create Contract Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupFormModal;
