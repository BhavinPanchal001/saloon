import React from 'react';

export const AuthSection: React.FC = () => {
  return (
    <div>
      <h3 className="form-section-title">Login Credentials</h3>
      <p style={{ color: 'var(--emp-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        These details are used for the employee to access the internal system.
      </p>

      <div className="form-grid">
        <div className="form-field">
          <label>Username / Login Email*</label>
          <input type="text" placeholder="j.doe" />
        </div>
        <div className="form-field">
          <label>Initial Password</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <div className="form-field">
          <label>Access Role</label>
          <select>
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div className="form-field">
          <label>Account Status</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="authStatus" defaultChecked /> Enabled
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="authStatus" /> Disabled
            </label>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#fffbeb', 
        border: '1px solid #fde68a', 
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#92400e'
      }}>
        <strong>Note:</strong> Enabling login access will send an automated invitation email to the employee's company email.
      </div>
    </div>
  );
};
