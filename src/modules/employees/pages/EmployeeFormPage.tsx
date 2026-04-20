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
            className="flex items-center gap-1.5 text-navy-600 hover:text-navy-900 font-bold transition-colors mb-2"
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: 0,
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
