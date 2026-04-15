import React, { useState } from 'react';
import { 
  User, Briefcase, Shield, 
  CreditCard, FileText, CheckCircle 
} from 'lucide-react';
import { ProfileSection } from './ProfileSection';
import { EmploymentSection } from './EmploymentSection';
import { AuthSection } from './AuthSection';
import { BankSection } from './BankSection';
import { DocumentSection } from './DocumentSection';

type FormTab = 'profile' | 'employment' | 'auth' | 'bank' | 'documents';

export const EmployeeForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FormTab>('profile');

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: <User size={18} /> },
    { id: 'employment', label: 'Employment', icon: <Briefcase size={18} /> },
    { id: 'auth', label: 'System Access', icon: <Shield size={18} /> },
    { id: 'bank', label: 'Bank Details', icon: <CreditCard size={18} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
  ];

  return (
    <div className="employee-form-container">
      <div className="form-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as FormTab)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className="glass-card">
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'employment' && <EmploymentSection />}
        {activeTab === 'auth' && <AuthSection />}
        {activeTab === 'bank' && <BankSection />}
        {activeTab === 'documents' && <DocumentSection />}
        
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '1rem',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '1.5rem'
        }}>
          <button className="btn btn-outline">Cancel</button>
          <button className="btn btn-primary">
            <CheckCircle size={18} />
            Save Employee
          </button>
        </div>
      </div>
    </div>
  );
};
