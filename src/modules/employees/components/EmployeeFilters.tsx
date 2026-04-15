import React from 'react';
import { Search, Filter, Plus, Download } from 'lucide-react';

interface EmployeeFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  onAddClick: () => void;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({ 
  onSearch, 
  onFilterChange, 
  onAddClick 
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
        <select className="btn btn-outline" onChange={(e) => onFilterChange({ department: e.target.value })}>
          <option value="">All Departments</option>
          <option value="hr">Human Resources</option>
          <option value="eng">Engineering</option>
          <option value="sales">Sales</option>
        </select>

        <select className="btn btn-outline" onChange={(e) => onFilterChange({ status: e.target.value })}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Resigned">Resigned</option>
        </select>

        <button className="btn btn-outline">
          <Download size={18} />
          Export
        </button>

        <button className="btn btn-primary" onClick={onAddClick}>
          <Plus size={18} />
          Add Employee
        </button>
      </div>
    </div>
  );
};
