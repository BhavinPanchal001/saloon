import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, Shield, 
  CreditCard, CheckCircle
} from 'lucide-react';
import { ProfileSection } from './ProfileSection';
import { EmploymentSection } from './EmploymentSection';
import { AuthSection } from './AuthSection';
import { BankSection } from './BankSection';
import { fetchStaffProfile, saveStaff } from '../../../../services/api';
import { useToastStore } from '../../../../stores/toastStore';

import { APP_ROLES, toAppRoleValue } from '../../../../../shared/appRoles.js';
import { splitEmployeePhone, digitsOnly } from '../../../../../shared/employeePhone.js';
import { normalizeEmployee, validateEmployee, fieldTab } from '../../../../../shared/employeeValidation.js';

type FormTab = 'profile' | 'employment' | 'auth' | 'bank';

export const EmployeeForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastStore();
  const [activeTab, setActiveTab] = useState<FormTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [loadFailed, setLoadFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const roles = APP_ROLES;

  const [formData, setFormData] = useState<any>({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: '',
    phoneCountry: '',
    email: '',
    password: '',
    accountEnabled: true,
    personalEmail: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    biometricCode: '',
    joiningDate: '',
    role: '',
    roleId: '',
    assignedOutletId: '',
    onboardingStatus: 'approved',
    commissionSlab: 'Tier 1',
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
            employeeCode: data.employeeCode || '',
            password: '',
            userId: data.userId,
            accountEnabled: data.accountEnabled ?? true,
            firstName: data.firstName || data.name?.split(' ')[0] || '',
            middleName: data.middleName || '',
            lastName: data.lastName || data.name?.split(' ')[1] || '',
            name: data.name,
            ...splitEmployeePhone(data.phone || ''),
            email: data.email || '',
            personalEmail: data.personalEmail || '',
            dob: data.dob || '',
            gender: data.gender || '',
            maritalStatus: data.maritalStatus || data.marital_status || '',
            biometricCode: data.biometricCode || '',
            joiningDate: data.joiningDate || '',
            role: toAppRoleValue(data.role),
            roleId: data.roleId || '',
            assignedOutletId: data.assignedOutletId || '',
            onboardingStatus: data.onboardingStatus || 'approved',
            commissionSlab: data.commissionSlab || 'Tier 1',
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
        setLoadFailed(true);
        toast.error('Failed to load employee profile for editing');
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [id]);

  const clearError = (field: string) => setErrors(previous => {
    const next = { ...previous };
    delete next[field];
    return next;
  });

  const handleInputChange = (field: string, value: any) => {
    if (field === 'phone') value = digitsOnly(value);
    clearError(field);
    if (field === 'phoneCountryCode') clearError('phone');
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: any) => {
    clearError('address.' + field);
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handleBankChange = (field: string, value: any) => {
    clearError('bankDetails.' + field);
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

    if (isSaving || isLoading || loadFailed) return;
    const validationErrors = validateEmployee(formData, { isEditing: Boolean(id) });
    setErrors(validationErrors);
    const firstField = Object.keys(validationErrors)[0];
    if (firstField) {
      setActiveTab(fieldTab(firstField) as FormTab);
      toast.error(validationErrors[firstField]);
      return;
    }

    setIsSaving(true);
    try {
      await saveStaff(normalizeEmployee(formData));
      toast.success(id ? 'Employee updated successfully' : 'Employee registered successfully');
      navigate('/staff');
    } catch (err: any) {
      if (err.errors) {
        setErrors(err.errors);
        const firstField = Object.keys(err.errors)[0];
        if (firstField) setActiveTab(fieldTab(firstField) as FormTab);
      }
      toast.error(err.message || 'Failed to save employee record');
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
    <form className="employee-form-container" onSubmit={handleSubmit} noValidate>
      {isLoading && <p role="status">Loading employee...</p>}
      {loadFailed && <p role="alert">Unable to load this employee. Reload before editing.</p>}
      <fieldset disabled={isSaving || isLoading || loadFailed} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
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
            errors={errors}
            formData={formData} 
            onChange={handleInputChange} 
            onAddressChange={handleAddressChange} 
          />
        )}
        {activeTab === 'employment' && (
          <EmploymentSection 
            roles={roles}
            errors={errors}
            formData={formData} 
            onChange={handleInputChange} 
          />
        )}
        {activeTab === 'auth' && <AuthSection formData={formData} onChange={handleInputChange} roles={roles} errors={errors} isEditing={Boolean(id)} />}
        {activeTab === 'bank' && (
          <BankSection 
            errors={errors}
            formData={formData} 
            onBankChange={handleBankChange} 
          />
        )}
        
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '1.5rem'
        }}>
          {/* Back button — show on all tabs except profile */}
          {activeTab !== 'profile' ? (
            <button
              type="button"
              onClick={() => {
                const tabIdx = tabs.findIndex(t => t.id === activeTab);
                if (tabIdx > 0) setActiveTab(tabs[tabIdx - 1].id as FormTab);
              }}
              className="btn-premium-outline"
            >
              Back
            </button>
          ) : (
            <div /> // Spacer
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* If not the last tab, show "Next Step" and "Cancel" */}
            {activeTab !== 'bank' ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/staff')}
                  className="btn-premium-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tabErrors = Object.fromEntries(Object.entries(validateEmployee(formData, { isEditing: Boolean(id) })).filter(([field]) => fieldTab(field) === activeTab));
                    setErrors(tabErrors);
                    if (Object.keys(tabErrors).length) {
                      toast.error(Object.values(tabErrors)[0] as string);
                      return;
                    }
                    const tabIdx = tabs.findIndex(t => t.id === activeTab);
                    if (tabIdx < tabs.length - 1) setActiveTab(tabs[tabIdx + 1].id as FormTab);
                  }}
                  className="btn-premium-primary"
                >
                  Next Step
                </button>
              </>
            ) : (
              /* If the last tab (bank), show "Cancel" and "Save/Update Employee" */
              <>
                <button
                  type="button"
                  onClick={() => navigate('/staff')}
                  className="btn-premium-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-premium-primary"
                >
                  <CheckCircle size={18} />
                  {isSaving ? 'Saving...' : id ? 'Update Employee' : 'Save Employee'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      </fieldset>
    </form>
  );
};
