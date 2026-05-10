import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  CreditCard, 
  User, 
  MapPin, 
  Landmark,
  CheckCircle,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import { useBankStore } from '../../../stores/bankStore';
import { BankFormData } from '../types';
import '../styles/bank.css';

const BankFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { banks, addBank, updateBank, getBankById, defaultBank } = useBankStore();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState<BankFormData>({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    branchAddress: '',
    isDefault: false,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      const bank = getBankById(id);
      if (bank) {
        setFormData({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountHolderName: bank.accountHolderName,
          ifscCode: bank.ifscCode,
          branchName: bank.branchName,
          branchAddress: bank.branchAddress || '',
          isDefault: bank.isDefault,
          isActive: bank.isActive,
        });
      } else {
        navigate('/bank');
      }
    } else {
      // For new bank, if no default exists, suggest making this default
      const hasDefault = banks.some(b => b.isDefault);
      if (!hasDefault && banks.length === 0) {
        setFormData(prev => ({ ...prev, isDefault: true }));
      }
    }
  }, [id, isEditMode, getBankById, navigate, banks]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d{9,18}$/.test(formData.accountNumber.replace(/\s/g, ''))) {
      newErrors.accountNumber = 'Please enter a valid account number (9-18 digits)';
    }

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifscCode.trim())) {
      newErrors.ifscCode = 'Please enter a valid IFSC code (e.g., SBIN0001234)';
    }

    if (!formData.branchName.trim()) {
      newErrors.branchName = 'Branch name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        updateBank(id, formData);
      } else {
        addBank(formData);
      }
      navigate('/bank');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof BankFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatIFSC = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
  };

  return (
    <div className="bank-module">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/bank')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {isEditMode ? 'Edit Bank Account' : 'Add Bank Account'}
          </h1>
          <p className="text-sm text-navy-500">
            {isEditMode 
              ? 'Update your bank account details.' 
              : 'Add a new bank account for transactions.'}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bank-form space-y-6">
        {/* Bank Information Section */}
        <div className="bank-form-section">
          <h2 className="bank-form-title">
            <Building2 className="w-5 h-5 text-navy-600" />
            Bank Information
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Bank Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <input
                  type="text"
                  placeholder="e.g., State Bank of India"
                  className={`premium-input pl-12 ${errors.bankName ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                />
              </div>
              {errors.bankName && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.bankName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Account Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <input
                  type="text"
                  placeholder="Enter account number"
                  className={`premium-input pl-12 ${errors.accountNumber ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {errors.accountNumber && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.accountNumber}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Account Holder Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <input
                  type="text"
                  placeholder="Full name as per bank records"
                  className={`premium-input pl-12 ${errors.accountHolderName ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                  value={formData.accountHolderName}
                  onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                />
              </div>
              {errors.accountHolderName && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.accountHolderName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                IFSC Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <input
                  type="text"
                  placeholder="e.g., SBIN0001234"
                  className={`premium-input pl-12 font-mono uppercase ${errors.ifscCode ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                  value={formData.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', formatIFSC(e.target.value))}
                  maxLength={11}
                />
              </div>
              {errors.ifscCode ? (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.ifscCode}
                </p>
              ) : (
                <p className="text-xs text-slate-500">11 characters (4 letters + 0 + 6 alphanumeric)</p>
              )}
            </div>
          </div>
        </div>

        {/* Branch Information Section */}
        <div className="bank-form-section">
          <h2 className="bank-form-title">
            <MapPin className="w-5 h-5 text-navy-600" />
            Branch Information
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Branch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Main Branch, Mumbai"
                className={`premium-input ${errors.branchName ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                value={formData.branchName}
                onChange={(e) => handleInputChange('branchName', e.target.value)}
              />
              {errors.branchName && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.branchName}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Branch Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                placeholder="Enter branch address if needed"
                rows={3}
                className="premium-input resize-none"
                value={formData.branchAddress}
                onChange={(e) => handleInputChange('branchAddress', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bank-form-section">
          <h2 className="bank-form-title">
            <CheckCircle className="w-5 h-5 text-navy-600" />
            Account Settings
          </h2>
          
          <div className="space-y-4">
            <label className="checkbox-wrapper cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => handleInputChange('isDefault', e.target.checked)}
              />
              <div>
                <span className="checkbox-label">Set as Default Bank</span>
                <p className="checkbox-description">
                  This bank will be pre-selected for sales, expenses, and purchase orders.
                </p>
              </div>
            </label>

            <label className="checkbox-wrapper cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
              />
              <div>
                <span className="checkbox-label">Active Account</span>
                <p className="checkbox-description">
                  Only active accounts can be used for transactions.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/bank')}
            className="py-3.5 px-6 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3.5 px-6 text-sm font-bold text-white bg-navy-600 rounded-xl hover:bg-navy-700 shadow-lg shadow-navy-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Bank' : 'Create Bank Account')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankFormPage;
