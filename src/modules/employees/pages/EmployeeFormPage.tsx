import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '../components/EmployeeForm/EmployeeForm';
import '../styles/employees.css';

const EmployeeFormPage: React.FC = () => {
  return (
    <div className="employee-module">
      <header className="module-header">
        <div className="module-title">
          <button 
            onClick={() => window.history.back()} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: 'none', 
              border: 'none', 
              color: 'var(--emp-primary)', 
              cursor: 'pointer',
              fontWeight: '600',
              padding: 0,
              marginBottom: '0.5rem'
            }}
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
          <h1>Add New Employee</h1>
          <p>Fill in the details below to onboard a new team member.</p>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0' }}>
        <EmployeeForm />
      </div>
    </div>
  );
};

export default EmployeeFormPage;
