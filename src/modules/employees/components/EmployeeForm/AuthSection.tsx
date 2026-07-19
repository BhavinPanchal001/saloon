import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const AuthSection: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <h3 className="form-section-title">Login Credentials</h3>
      <p style={{ color: 'var(--emp-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        These details are used for the employee to access the internal system.
      </p>

      <div className="form-grid">
        <div className="form-field">
          <label>Username / Login Email*</label>
          <input type="text" placeholder="j.doe" autoComplete="off" />
        </div>
        <div className="form-field">
          <label>Initial Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              style={{ width: '100%', paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem'
              }}
              title={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
