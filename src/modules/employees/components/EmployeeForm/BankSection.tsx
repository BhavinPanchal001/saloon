import React from 'react';

export const BankSection: React.FC = () => {
  return (
    <div>
      <h3 className="form-section-title">Salary Disbursement Details</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Account Holder Name*</label>
          <input type="text" placeholder="John Doe" />
        </div>
        <div className="form-field">
          <label>Bank Name*</label>
          <input type="text" placeholder="Global Bank Corp" />
        </div>
        <div className="form-field">
          <label>Account Number*</label>
          <input type="text" placeholder="0000 0000 0000 0000" />
        </div>
        <div className="form-field">
          <label>Confirm Account Number*</label>
          <input type="text" placeholder="0000 0000 0000 0000" />
        </div>
        <div className="form-field">
          <label>IFSC / Swift Code*</label>
          <input type="text" placeholder="GBANK00123" />
        </div>
        <div className="form-field">
          <label>Branch Name</label>
          <input type="text" placeholder="Downtown Branch" />
        </div>
        <div className="form-field">
          <label>Account Type</label>
          <select>
            <option value="Savings">Savings</option>
            <option value="Current">Current</option>
          </select>
        </div>
      </div>
    </div>
  );
};
