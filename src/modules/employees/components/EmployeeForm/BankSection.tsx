import React from 'react';

interface BankSectionProps {
  formData: any;
  onBankChange: (field: string, value: any) => void;
}

export const BankSection: React.FC<BankSectionProps> = ({ 
  formData, 
  onBankChange 
}) => {
  return (
    <div>
      <h3 className="form-section-title">Salary Disbursement Details</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Account Holder Name*</label>
          <input 
            type="text" 
            placeholder="John Doe" 
            value={formData.bankDetails?.accountHolderName || ''}
            onChange={(e) => onBankChange('accountHolderName', e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>Bank Name*</label>
          <input 
            type="text" 
            placeholder="Global Bank Corp" 
            value={formData.bankDetails?.bankName || ''}
            onChange={(e) => onBankChange('bankName', e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>Account Number*</label>
          <input 
            type="text" 
            placeholder="0000 0000 0000 0000" 
            value={formData.bankDetails?.accountNumber || ''}
            onChange={(e) => onBankChange('accountNumber', e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>Confirm Account Number*</label>
          <input 
            type="text" 
            placeholder="0000 0000 0000 0000" 
            value={formData.bankDetails?.confirmAccountNumber || ''}
            onChange={(e) => onBankChange('confirmAccountNumber', e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>IFSC / Swift Code*</label>
          <input 
            type="text" 
            placeholder="GBANK00123" 
            value={formData.bankDetails?.ifscCode || ''}
            onChange={(e) => onBankChange('ifscCode', e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>Branch Name</label>
          <input 
            type="text" 
            placeholder="Downtown Branch" 
            value={formData.bankDetails?.branchName || ''}
            onChange={(e) => onBankChange('branchName', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Account Type</label>
          <select 
            value={formData.bankDetails?.accountType || 'Savings'}
            onChange={(e) => onBankChange('accountType', e.target.value)}
          >
            <option value="Savings">Savings</option>
            <option value="Current">Current</option>
          </select>
        </div>
      </div>
    </div>
  );
};
