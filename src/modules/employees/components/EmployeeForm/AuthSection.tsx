import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthSectionProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  roles: any[];
  errors: Record<string, string>;
  isEditing: boolean;
}

export const AuthSection: React.FC<AuthSectionProps> = ({ formData, onChange, roles, errors, isEditing }) => {
  const [showPassword, setShowPassword] = useState(false);
  const error = (field: string) => errors[field] && <small id={'error-' + field} role="alert" style={{ color: '#b91c1c' }}>{errors[field]}</small>;
  return (
    <div>
      <h3 className="form-section-title">Login Credentials</h3>
      <p style={{ color: 'var(--emp-text-muted)', marginBottom: '1.5rem' }}>
        A user account is created with each new employee. Share the login email and initial password with the employee.
      </p>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="employee-login-email">Login Email</label>
          <input id="employee-login-email" type="email" maxLength={150} placeholder={formData.personalEmail || 'Defaults to personal email'} value={formData.email || ''} onChange={e => onChange('email', e.target.value)} autoComplete="off" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'error-email' : 'login-email-help'} />
          {error('email')}
          <small id="login-email-help">Leave blank to use the personal email.</small>
        </div>
        <div className="form-field">
          <label htmlFor="employee-password">{isEditing ? 'New Password (optional)' : 'Initial Password*'}</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input id="employee-password" type={showPassword ? 'text' : 'password'} value={formData.password || ''} onChange={e => onChange('password', e.target.value)} autoComplete="new-password" style={{ width: '100%', paddingRight: '2.5rem' }} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'error-password' : 'password-help'} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error('password')}
          <small id="password-help">At least 8 characters, including uppercase, lowercase and a number. Leave blank to keep an existing account's password. If no account exists, enter an initial password to create it.</small>
        </div>
        <div className="form-field">
          <label htmlFor="employee-access-role">App User Role*</label>
          <select id="employee-access-role" value={formData.role || ''} aria-invalid={Boolean(errors.role)} onChange={e => onChange('role', e.target.value)}>
            <option value="">Select User Role</option>
            {roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <small>This is the same role selected in Employment.</small>
        </div>
        <div className="form-field">
          <label>Account Status</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label><input type="radio" name="authStatus" checked={formData.accountEnabled !== false} onChange={() => onChange('accountEnabled', true)} /> Enabled</label>
            <label><input type="radio" name="authStatus" checked={formData.accountEnabled === false} onChange={() => onChange('accountEnabled', false)} /> Disabled</label>
          </div>
          {error('accountEnabled')}
        </div>
      </div>
    </div>
  );
};
