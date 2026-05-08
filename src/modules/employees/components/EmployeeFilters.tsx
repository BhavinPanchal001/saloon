import React from 'react';
import { Search, Filter, Plus, Download, Upload } from 'lucide-react';

interface EmployeeFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  onAddClick: () => void;
  onImportClick?: () => void;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({ 
  onSearch, 
  onFilterChange, 
  onAddClick,
  onImportClick
}) => {
  return (
    <div className="filter-bar">
      <div className="search-input-wrapper">
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
          <Search size={18} />
        </span>
        <input 
          type="text" 
          placeholder="Search by name, email or employee ID..." 
          className="search-input"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <select className="premium-input px-4 py-2" style={{ width: 'auto', paddingRight: '3.5rem' }} onChange={(e) => onFilterChange({ department: e.target.value })}>
          <option value="">All Departments</option>
          <option value="hr">Human Resources</option>
          <option value="eng">Engineering</option>
          <option value="sales">Sales</option>
        </select>

        <select className="premium-input px-4 py-2" style={{ width: 'auto', paddingRight: '3.5rem' }} onChange={(e) => onFilterChange({ status: e.target.value })}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Resigned">Resigned</option>
        </select>

        <button className="btn-premium-outline">
          <Download size={18} />
          Export
        </button>

        {onImportClick && (
          <button className="btn-premium-outline" onClick={onImportClick}>
            <Upload size={18} />
            Import
          </button>
        )}

        <button className="btn-premium-primary" onClick={onAddClick}>
          <Plus size={18} />
          Add Employee
        </button>
      </div>
    </div>
  );
};
