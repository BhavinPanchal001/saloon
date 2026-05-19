import React, { useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { useBankStore } from '../../../stores/bankStore';

interface BankSelectorProps {
  value: string;
  onChange: (bankId: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showDefaultIndicator?: boolean;
}

const BankSelector: React.FC<BankSelectorProps> = ({
  value,
  onChange,
  label = 'Bank Account',
  required = false,
  placeholder = 'Select a bank account',
  className = '',
  disabled = false,
  showDefaultIndicator = true,
}) => {
  const { getActiveBanks, getDefaultBank, fetchBanks } = useBankStore();
  const activeBanks = getActiveBanks();
  const defaultBank = getDefaultBank();

  // Fetch banks from API on component mount
  useEffect(() => {
    if (activeBanks.length === 0) {
      fetchBanks();
    }
  }, [activeBanks.length, fetchBanks]);

  // If no value is selected and there's a default bank, auto-select it
  React.useEffect(() => {
    if (!value && defaultBank && showDefaultIndicator) {
      onChange(defaultBank.id);
    }
  }, [value, defaultBank, onChange, showDefaultIndicator]);

  if (activeBanks.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="text-sm font-semibold text-slate-700">
            {label}
            {required && <span className="text-rose-500"> *</span>}
          </label>
        )}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">No bank accounts found</p>
            <p className="text-amber-700 mt-1">
              Please{' '}
              <a href="/bank/new" className="underline font-medium hover:text-amber-900">
                add a bank account
              </a>{' '}
              first to use this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`premium-input pl-12 ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
        >
          <option value="">{placeholder}</option>
          {activeBanks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.bankName} - {bank.accountNumber.slice(-4).padStart(bank.accountNumber.length, '*')} 
              ({bank.accountHolderName})
              {bank.isDefault ? ' [Default]' : ''}
            </option>
          ))}
        </select>
      </div>
      {value && defaultBank?.id === value && showDefaultIndicator && (
        <p className="text-xs text-gold-600 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-gold-500"></span>
          Default bank account
        </p>
      )}
    </div>
  );
};

export default BankSelector;
