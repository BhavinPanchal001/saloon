import React from 'react';
import { MoreHorizontal, Eye, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { Employee } from '../../types';

interface EmployeeTableProps {
  employees: Employee[];
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
  return (
    <div className="glass-card" style={{ padding: 0 }}>
      <div className="employee-table-container">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Designation / Dept</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }}>
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{emp.firstName} {emp.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.employment.employeeCode}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: '500' }}>{emp.employment.designation}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.employment.department}</div>
                </td>
                <td>
                  <span className={`status-badge status-${emp.employment.status.toLowerCase().replace(' ', '-')}`}>
                    {emp.employment.status}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>{emp.employment.joiningDate}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => onView(emp.id)} className="btn btn-outline" style={{ padding: '0.4rem' }}>
                      <Eye size={16} />
                    </button>
                    <button onClick={() => onEdit(emp.id)} className="btn btn-outline" style={{ padding: '0.4rem' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(emp.id)} className="btn btn-outline" style={{ padding: '0.4rem', color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div style={{ 
        padding: '1rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderTop: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Showing 1 to {employees.length} of 45 employees
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" disabled>Previous</button>
          <button className="btn btn-outline">Next</button>
        </div>
      </div>
    </div>
  );
};
