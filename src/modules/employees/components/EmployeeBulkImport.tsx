import React, { useState, useRef } from 'react';
import { useToastStore } from '../../../stores/toastStore';
import { Upload, Download, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface EmployeeBulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (employees: any[]) => void;
}

const CSV_TEMPLATE_HEADERS = 'name,phone,role,baseSalary,assignedOutletName,status\n';
const CSV_TEMPLATE_EXAMPLE = 'John Doe,+60123456789,Stylist,3000,HSR Layout,Active\n';

export const EmployeeBulkImport: React.FC<EmployeeBulkImportProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const toast = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Validate required headers
        const requiredFields = ['name', 'phone', 'role'];
        const missingFields = requiredFields.filter(field => !headers.includes(field));
        
        if (missingFields.length > 0) {
          toast.error(`Missing required columns: ${missingFields.join(', ')}`);
          setIsProcessing(false);
          return;
        }

        // Parse data rows
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const row: any = { lineNumber: index + 2 };
          
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          
          return row;
        }).filter(row => row.name); // Filter out empty rows

        setPreviewData(data);
        setStep('preview');
        setIsProcessing(false);
      } catch (error) {
        toast.error('Failed to parse CSV file');
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    const validData = previewData.filter(row => validateRow(row).valid);
    
    if (validData.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    // Transform data to match StaffMember interface
    const transformedData = validData.map(row => ({
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: row.name,
      phone: row.phone,
      role: row.role,
      baseSalary: parseFloat(row.basesalary) || 0,
      assignedOutletName: row.assignedoutletname || 'Not Assigned',
      status: row.status || 'Active',
    }));

    onImport(transformedData);
    toast.success(`Successfully imported ${transformedData.length} employees`);
    handleClose();
  };

  const validateRow = (row: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!row.name || row.name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    if (!row.phone) {
      errors.push('Phone is required');
    } else if (!/^\+?[\d\s-]{10,}$/.test(row.phone)) {
      errors.push('Invalid phone format');
    }
    
    if (!row.role) {
      errors.push('Role is required');
    }
    
    if (row.basesalary && isNaN(parseFloat(row.basesalary))) {
      errors.push('Base salary must be a number');
    }
    
    return { valid: errors.length === 0, errors };
  };

  const handleClose = () => {
    setPreviewData([]);
    setStep('upload');
    setIsProcessing(false);
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_HEADERS + CSV_TEMPLATE_EXAMPLE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const totalRecords = previewData.length;
  const validRecords = previewData.filter(row => validateRow(row).valid).length;
  const invalidRecords = totalRecords - validRecords;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-white/50 bg-white shadow-float">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-navy-50/50 bg-gradient-to-r from-navy-900 to-navy-800 px-5 sm:px-8 py-4 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 flex-shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Bulk Import Employees</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {step === 'upload' ? 'Upload a CSV file to import multiple employees' : 'Review data before importing'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Download Template */}
              <div className="rounded-2xl border border-gold-100 bg-gold-50/30 p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 flex-shrink-0">
                    <Download className="h-6 w-6 text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-navy-900 text-sm sm:text-base">Download Template</h4>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600">
                      Get the CSV template with the correct format for bulk importing employees.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gold-300 bg-white px-4 py-2 text-sm font-medium text-gold-700 transition-colors hover:bg-gold-50"
                    >
                      <Download className="h-4 w-4" />
                      Download CSV Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-12 text-center transition-all ${
                  isDragging
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-slate-300 bg-slate-50 hover:border-navy-300 hover:bg-slate-100'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-navy-100 mx-auto">
                  <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-navy-600" />
                </div>
                <p className="mt-4 text-base sm:text-lg font-medium text-navy-900">
                  Drop your CSV file here, or click to browse
                </p>
                <p className="mt-2 text-xs sm:text-sm text-slate-500">
                  Supported format: .csv (max 5MB)
                </p>
              </div>

              {/* Required Fields */}
              <div className="rounded-2xl border border-slate-200 bg-white/50 p-4 sm:p-6">
                <h4 className="font-semibold text-navy-900 text-sm sm:text-base">Required CSV Columns</h4>
                <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {[
                    { name: 'name', desc: 'Employee full name' },
                    { name: 'phone', desc: 'Contact number' },
                    { name: 'role', desc: 'Job role/position' },
                    { name: 'baseSalary', desc: 'Base salary (optional)' },
                    { name: 'assignedOutletName', desc: 'Outlet assignment (optional)' },
                    { name: 'status', desc: 'Active/Inactive (optional)' },
                  ].map((field) => (
                    <div key={field.name} className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${field.name === 'name' || field.name === 'phone' || field.name === 'role' ? 'text-rose-600' : 'text-slate-400'}`}>
                        {field.name === 'name' || field.name === 'phone' || field.name === 'role' ? '* ' : ''}
                      </span>
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-navy-900">
                        {field.name}
                      </code>
                      <span className="text-xs text-slate-500">{field.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-2xl border border-navy-100 bg-navy-50/30 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Records</p>
                  <p className="mt-1 text-2xl font-bold text-navy-900">{totalRecords}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">Valid Records</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{validRecords}</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase">Invalid Records</p>
                  <p className="mt-1 text-2xl font-bold text-rose-600">{invalidRecords}</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Role</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Salary</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((row, index) => {
                      const validation = validateRow(row);
                      return (
                        <tr key={index} className={validation.valid ? '' : 'bg-rose-50/50'}>
                          <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-navy-900">{row.name}</span>
                              {!validation.valid && (
                                <span title={validation.errors.join(', ')}>
                                  <AlertCircle className="h-4 w-4 text-rose-500" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.phone}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.role}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">
                            {row.basesalary ? `$${parseFloat(row.basesalary).toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {validation.valid ? (
                              <CheckCircle className="mx-auto h-5 w-5 text-emerald-500" />
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between border-t border-navy-50/50 bg-slate-50/50 px-5 sm:px-8 py-4 sm:py-5">
          <button
            onClick={step === 'preview' ? () => setStep('upload') : handleClose}
            className="btn-premium-outline"
          >
            {step === 'preview' ? 'Back' : 'Cancel'}
          </button>
          
          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={validRecords === 0}
              className="btn-premium-primary disabled:opacity-50"
            >
              Import {validRecords} Employees
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
