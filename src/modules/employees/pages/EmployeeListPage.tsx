import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmployeeFilters } from '../components/EmployeeFilters';
import { EmployeeTable } from '../components/EmployeeTable/EmployeeTable';
import { Employee } from '../types';
import '../styles/employees.css';

// Mock Data
const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1',
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex.r@personal.com',
    phone: '+1 234 567 8901',
    dob: '1992-05-12',
    gender: 'Male',
    address: { street: '123 Oak St', city: 'Denver', state: 'CO', country: 'USA', pincode: '80202' },
    auth: { username: 'alex.rivera', loginEnabled: true, role: 'Employee', status: 'Active' },
    employment: {
      employeeCode: 'EMP-001',
      companyEmail: 'arivera@company.com',
      hireDate: '2023-01-15',
      joiningDate: '2023-02-01',
      type: 'Full-time',
      status: 'Active',
      location: 'Denver Office',
      department: 'Engineering',
      designation: 'Senior Developer'
    },
    bank: {
      accountHolderName: 'Alex Rivera',
      accountNumber: '**** **** 1234',
      ifscCode: 'CHASE001',
      bankName: 'JP Morgan Chase',
      branchName: 'Denver Downtown',
      accountType: 'Savings'
    },
    documents: [],
    createdAt: '2023-01-15',
    updatedAt: '2024-03-20'
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.c@personal.com',
    phone: '+1 234 888 9999',
    dob: '1994-08-22',
    gender: 'Female',
    address: { street: '456 Maple Ave', city: 'Seattle', state: 'WA', country: 'USA', pincode: '98101' },
    auth: { username: 'sarah.chen', loginEnabled: true, role: 'Manager', status: 'Active' },
    employment: {
      employeeCode: 'EMP-002',
      companyEmail: 'schen@company.com',
      hireDate: '2022-11-10',
      joiningDate: '2022-12-01',
      type: 'Full-time',
      status: 'On Leave',
      location: 'Seattle Hub',
      department: 'Product',
      designation: 'Product Manager'
    },
    bank: {
      accountHolderName: 'Sarah Chen',
      accountNumber: '**** **** 5678',
      ifscCode: 'BOA12345',
      bankName: 'Bank of America',
      branchName: 'Seattle Pioneer Sq',
      accountType: 'Savings'
    },
    documents: [],
    createdAt: '2022-11-10',
    updatedAt: '2024-04-01'
  }
];

const EmployeeListPage: React.FC = () => {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
  };

  const handleFilterChange = (filters: any) => {
    console.log('Filters changed:', filters);
  };

  return (
    <div className="employee-module">
      <header className="module-header">
        <div className="module-title">
          <h1>Employee Management</h1>
          <p>Organize, view, and manage your workforce with ease.</p>
        </div>
      </header>

      {/* Stats Summary Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Employees</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>45</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Active</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', color: '#10b981' }}>42</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>On Leave</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', color: '#f59e0b' }}>2</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Departments</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>8</div>
        </div>
      </div>

      <EmployeeFilters 
        onSearch={handleSearch} 
        onFilterChange={handleFilterChange} 
        onAddClick={() => navigate('/staff/add')} 
      />

      <EmployeeTable 
        employees={employees}
        onView={(id) => navigate(`/staff/${id}`)}
        onEdit={(id) => navigate(`/staff/edit/${id}`)}
        onDelete={(id) => console.log('Delete logic will go here', id)}
      />
    </div>
  );
};


export default EmployeeListPage;
