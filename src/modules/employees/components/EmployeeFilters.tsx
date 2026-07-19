import React from 'react';
import { Search, Filter, Plus, Download, Upload } from 'lucide-react';

interface EmployeeFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  onAddClick: () => void;
  onImportClick?: () => void;
  onExportClick?: () => void;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({ 
  onSearch, 
  onFilterChange, 
  onAddClick,
  onImportClick,
  onExportClick
}) => {
  return (
    <div className="flex flex-col gap-3.5 mb-6 w-full lg:flex-row lg:items-center lg:justify-between">
      {/* Search Bar */}
      <div className="relative w-full lg:w-[260px]">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={18} />
        </span>
        <input 
          type="text" 
          placeholder="Search by name, email or employee ID..." 
          className="premium-input pl-10 w-full"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        <select 
          className="premium-input px-3.5 py-2 w-full sm:w-[125px]" 
          style={{ paddingRight: '2rem' }}
          onChange={(e) => onFilterChange({ status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Resigned">Resigned</option>
        </select>

        {onExportClick && (
          <button className="btn-premium-outline w-full sm:w-auto justify-center px-4 py-2.5 text-sm font-bold tracking-wide" onClick={onExportClick}>
            <Download size={18} />
            <span>Export</span>
          </button>
        )}

        {onImportClick && (
          <button className="btn-premium-outline w-full sm:w-auto justify-center px-4 py-2.5 text-sm font-bold tracking-wide" onClick={onImportClick}>
            <Upload size={18} />
            <span>Import</span>
          </button>
        )}

        <button className="btn-premium-primary w-full sm:w-auto justify-center px-4 py-2.5 text-sm font-bold tracking-wide whitespace-nowrap flex items-center gap-2" onClick={onAddClick}>
          <Plus size={18} />
          <span>Add Employee</span>
        </button>
      </div>
    </div>
  );
};

