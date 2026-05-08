import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  assignedOutletName: string;
  baseSalary?: number;
  status?: string;
}

interface EmployeeTableProps {
  employees: StaffMember[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ 
  employees, 
  onView, 
  onEdit, 
  onDelete 
}) => {
  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format salary
  const formatSalary = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status badge class
  const getStatusClass = (status?: string) => {
    if (!status || status === 'Active') return 'status-active';
    if (status === 'On Leave') return 'status-on-leave';
    if (status === 'Resigned') return 'status-resigned';
    return 'status-active';
  };

  return (
    <div className="glass-card" style={{ padding: 0 }}>
      <div className="employee-table-container">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role / Outlet</th>
              <th>Status</th>
              <th>Base Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center font-bold text-navy-600 text-sm">
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-navy-900">{emp.name}</div>
                      <div className="text-xs text-navy-400">{emp.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="font-medium text-navy-900">{emp.role}</div>
                  <div className="text-xs text-navy-400">{emp.assignedOutletName}</div>
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(emp.status)}`}>
                    {emp.status || 'Active'}
                  </span>
                </td>
                <td>
                  <div className="text-sm font-medium text-navy-900">{formatSalary(emp.baseSalary)}</div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onView(emp.id)} 
                      className="h-9 w-9 flex items-center justify-center rounded-xl border border-navy-100 bg-white/50 text-navy-600 hover:bg-navy-50 hover:text-navy-900 transition-all"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => onEdit(emp.id)} 
                      className="h-9 w-9 flex items-center justify-center rounded-xl border border-navy-100 bg-white/50 text-navy-600 hover:bg-navy-50 hover:text-navy-900 transition-all"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(emp.id)} 
                      className="h-9 w-9 flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50/30 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer - Now shows actual count */}
      <div className="px-4 py-3 flex justify-between items-center border-t border-navy-100">
        <div className="text-sm text-navy-500">
          Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </div>
        <div className="flex gap-2">
          <button className="btn-premium-outline !py-2 !px-4" disabled>Previous</button>
          <button className="btn-premium-outline !py-2 !px-4">Next</button>
        </div>
      </div>
    </div>
  );
};
