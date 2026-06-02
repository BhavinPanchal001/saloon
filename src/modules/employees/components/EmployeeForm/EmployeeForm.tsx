import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, Shield, 
  CreditCard, FileText, CheckCircle 
} from 'lucide-react';
import { ProfileSection } from './ProfileSection';
import { EmploymentSection } from './EmploymentSection';
import { AuthSection } from './AuthSection';
import { BankSection } from './BankSection';
import { fetchStaffProfile, saveStaff } from '../../../../services/api';
import { useToastStore } from '../../../../stores/toastStore';

type FormTab = 'profile' | 'employment' | 'auth' | 'bank';

export const EmployeeForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastStore();
  const [activeTab, setActiveTab] = useState<FormTab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    email: '',
    personalEmail: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    biometricCode: '',
    joiningDate: '',
    role: '',
    roleId: '',
    assignedOutletId: '',
    onboardingStatus: 'pending',
    baseSalary: '',
    commissionSlab: 'Tier 1',
    pfDeduction: '',
    taxType: 'percentage',
    taxValue: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'IN',
      pincode: ''
    },
    bankDetails: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      branchName: '',
      accountType: 'Savings'
    }
  });

  // Load employee details if in Edit Mode
  useEffect(() => {
    if (!id) return;

    const loadEmployee = async () => {
      try {
        const data = await fetchStaffProfile(id);
        if (data) {
          setFormData({
            id: data.id,
            firstName: data.firstName || data.name?.split(' ')[0] || '',
            middleName: data.middleName || '',
            lastName: data.lastName || data.name?.split(' ')[1] || '',
            name: data.name,
            phone: data.phone || '',
            email: data.email || '',
            personalEmail: data.personalEmail || '',
            dob: data.dob || '',
            gender: data.gender || '',
            maritalStatus: data.maritalStatus || '',
            biometricCode: data.biometricCode || '',
            joiningDate: data.joiningDate || '',
            role: data.role || '',
            roleId: data.roleId || '',
            assignedOutletId: data.assignedOutletId || '',
            onboardingStatus: data.onboardingStatus || 'pending',
            baseSalary: data.baseSalary || '',
            commissionSlab: data.commissionSlab || 'Tier 1',
            pfDeduction: data.pfDeduction || '',
            taxType: data.taxType || 'percentage',
            taxValue: data.taxValue || '',
            address: {
              street: data.address?.street || '',
              city: data.address?.city || '',
              state: data.address?.state || '',
              country: data.address?.country || 'IN',
              pincode: data.address?.pincode || ''
            },
            bankDetails: {
              accountHolderName: data.bankDetails?.accountHolderName || '',
              bankName: data.bankDetails?.bankName || '',
              accountNumber: data.bankDetails?.accountNumber || '',
              confirmAccountNumber: data.bankDetails?.confirmAccountNumber || data.bankDetails?.accountNumber || '',
              ifscCode: data.bankDetails?.ifscCode || '',
              branchName: data.bankDetails?.branchName || '',
              accountType: data.bankDetails?.accountType || 'Savings'
            }
          });
        }
      } catch (err) {
        toast.error('Failed to load employee profile for editing');
      }
    };

    loadEmployee();
  }, [id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handleBankChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.personalEmail) {
      toast.error('Please fill in all required profile fields');
      setActiveTab('profile');
      return;
    }
    if (!formData.assignedOutletId || !formData.joiningDate || !formData.roleId) {
      toast.error('Please fill in all required employment details');
      setActiveTab('employment');
      return;
    }
    if (formData.bankDetails?.accountNumber !== formData.bankDetails?.confirmAccountNumber) {
      toast.error('Bank account numbers do not match');
      setActiveTab('bank');
      return;
    }

    setIsSaving(true);
    try {
      await saveStaff(formData);
      toast.success(id ? 'Employee updated successfully' : 'Employee registered successfully');
      navigate('/staff');
    } catch (err) {
      toast.error('Failed to save employee record');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: <User size={18} /> },
    { id: 'employment', label: 'Employment', icon: <Briefcase size={18} /> },
    { id: 'auth', label: 'System Access', icon: <Shield size={18} /> },
    { id: 'bank', label: 'Bank Details', icon: <CreditCard size={18} /> },
  ];

  return (
    <form className="employee-form-container" onSubmit={handleSubmit}>
      <div className="form-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
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
        {activeTab === 'profile' && (
          <ProfileSection 
            formData={formData} 
            onChange={handleInputChange} 
            onAddressChange={handleAddressChange} 
          />
        )}
        {activeTab === 'employment' && (
          <EmploymentSection 
            formData={formData} 
            onChange={handleInputChange} 
          />
        )}
        {activeTab === 'auth' && <AuthSection />}
        {activeTab === 'bank' && (
          <BankSection 
            formData={formData} 
            onBankChange={handleBankChange} 
          />
        )}
        
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '1rem',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '1.5rem'
        }}>
          <button type="button" onClick={() => navigate('/staff')} className="btn-premium-outline">Cancel</button>
          <button type="submit" disabled={isSaving} className="btn-premium-primary">
            <CheckCircle size={18} />
            {isSaving ? 'Saving...' : id ? 'Update Employee' : 'Save Employee'}
          </button>
        </div>
      </div>
    </form>
  );
};
