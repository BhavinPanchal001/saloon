import React from 'react';

interface BankSectionProps {
  formData: any;
  errors?: Record<string, string>;
  onBankChange: (field: string, value: any) => void;
}

export const BankSection: React.FC<BankSectionProps> = ({ 
  errors = {},
  formData, 
  onBankChange 
}) => {
  return (
    <div>
      <h3 className="form-section-title">Bank Details</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Account Holder Name*</label>
          <input aria-invalid={Boolean(errors['bankDetails.accountHolderName'])} aria-describedby={errors['bankDetails.accountHolderName'] ? 'error-bankDetails.accountHolderName' : undefined}
            type="text" 
            placeholder="John Doe" 
            value={formData.bankDetails?.accountHolderName || ''}
            onChange={(e) => onBankChange('accountHolderName', e.target.value)}
            required
          />
            {errors['bankDetails.accountHolderName'] && <small id="error-bankDetails.accountHolderName" role="alert" style={{ color: '#b91c1c' }}>{errors['bankDetails.accountHolderName']}</small>}
        </div>
        <div className="form-field">
          <label>Bank Name*</label>
          <input aria-invalid={Boolean(errors['bankDetails.bankName'])} aria-describedby={errors['bankDetails.bankName'] ? 'error-bankDetails.bankName' : undefined}
            type="text" 
            placeholder="Global Bank Corp" 
            value={formData.bankDetails?.bankName || ''}
            onChange={(e) => onBankChange('bankName', e.target.value)}
            required
          />
            {errors['bankDetails.bankName'] && <small id="error-bankDetails.bankName" role="alert" style={{ color: '#b91c1c' }}>{errors['bankDetails.bankName']}</small>}
        </div>
        <div className="form-field">
          <label>Account Number*</label>
          <input aria-invalid={Boolean(errors['bankDetails.accountNumber'])} aria-describedby={errors['bankDetails.accountNumber'] ? 'error-bankDetails.accountNumber' : undefined}
            type="text" 
            placeholder="0000 0000 0000 0000" 
            value={formData.bankDetails?.accountNumber || ''}
            onChange={(e) => onBankChange('accountNumber', e.target.value)}
            required
          />
            {errors['bankDetails.accountNumber'] && <small id="error-bankDetails.accountNumber" role="alert" style={{ color: '#b91c1c' }}>{errors['bankDetails.accountNumber']}</small>}
        </div>
        <div className="form-field">
          <label>Confirm Account Number*</label>
          <input aria-invalid={Boolean(errors['bankDetails.confirmAccountNumber'])} aria-describedby={errors['bankDetails.confirmAccountNumber'] ? 'error-bankDetails.confirmAccountNumber' : undefined}
            type="text" 
            placeholder="0000 0000 0000 0000" 
            value={formData.bankDetails?.confirmAccountNumber || ''}
            onChange={(e) => onBankChange('confirmAccountNumber', e.target.value)}
            required
          />
            {errors['bankDetails.confirmAccountNumber'] && <small id="error-bankDetails.confirmAccountNumber" role="alert" style={{ color: '#b91c1c' }}>{errors['bankDetails.confirmAccountNumber']}</small>}
        </div>
        <div className="form-field">
          <label>IFSC / Swift Code*</label>
          <input aria-invalid={Boolean(errors['bankDetails.ifscCode'])} aria-describedby={errors['bankDetails.ifscCode'] ? 'error-bankDetails.ifscCode' : undefined}
            type="text" 
            placeholder="SBIN0001234"
            value={formData.bankDetails?.ifscCode || ''}
            onChange={(e) => onBankChange('ifscCode', e.target.value)}
            required
          />
            {errors['bankDetails.ifscCode'] && <small id="error-bankDetails.ifscCode" role="alert" style={{ color: '#b91c1c' }}>{errors['bankDetails.ifscCode']}</small>}
        </div>
        <div className="form-field">
          <label>Branch Name</label>
          <input aria-invalid={Boolean(errors['bankDetails.branchName'])} aria-describedby={errors['bankDetails.branchName'] ? 'error-bankDetails.branchName' : undefined}
            type="text" 
            placeholder="Downtown Branch" 
            value={formData.bankDetails?.branchName || ''}
            onChange={(e) => onBankChange('branchName', e.target.value)}
          />
            {errors['bankDetails.branchName'] && <small id="error-bankDetails.branchName" role="alert" style={{ color: '#b91c1c' }}>{errors['bankDetails.branchName']}</small>}
        </div>
        <div className="form-field">
          <label>Account Type</label>
          <select aria-invalid={Boolean(errors['bankDetails.accountType'])} aria-describedby={errors['bankDetails.accountType'] ? 'error-bankDetails.accountType' : undefined}
            value={formData.bankDetails?.accountType || 'Savings'}
            onChange={(e) => onBankChange('accountType', e.target.value)}
          >
            <option value="Savings">Savings</option>
            <option value="Current">Current</option>
          </select>
            {errors['bankDetails.accountType'] && <small id="error-bankDetails.accountType" role="alert" style={{ color: '#b91c1c' }}>{errors['bankDetails.accountType']}</small>}
        </div>
      </div>
    </div>
  );
};
