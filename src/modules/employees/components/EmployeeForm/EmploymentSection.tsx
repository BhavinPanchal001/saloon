import React, { useState, useEffect } from 'react';
import { fetchOutlets } from '../../../../services/api';

interface EmploymentSectionProps {
  formData: any;
  roles: any[];
  errors?: Record<string, string>;
  onChange: (field: string, value: any) => void;
}

export const EmploymentSection: React.FC<EmploymentSectionProps> = ({ 
  errors = {},
  roles: rolesList,
  formData, 
  onChange 
}) => {
  const [outletsList, setOutletsList] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const outletsData = await fetchOutlets();
        setOutletsList(outletsData);
      } catch (err) {
        setLoadError('Unable to load outlets. Reopen this tab to retry.');
      }
    };
    loadMasters();
  }, []);

  // Calculate sequential employee code when outlet changes
  const handleOutletChange = (outletId: string) => {
    onChange('assignedOutletId', outletId);
    if (!outletId) {
      onChange('employeeCode', '');
      return;
    }

    const selectedOutlet = outletsList.find(o => String(o.id) === outletId);
    if (selectedOutlet) {
      const prefix = selectedOutlet.employeeCodePrefix || selectedOutlet.code || 'EMP';
      const nextCount = (selectedOutlet.employeeCount || 0) + 1;
      const formattedCode = `${prefix}-${String(nextCount).padStart(3, '0')}`;
      if (!formData.id) onChange('employeeCode', formattedCode);
    }
  };

  return (
    <div>
      <h3 className="form-section-title">Job Details</h3>
      {loadError && <p role="alert">{loadError}</p>}
      <div className="form-grid">
        <div className="form-field">
          <label>Work Location / Outlet*</label>
          <select aria-invalid={Boolean(errors['assignedOutletId'])} aria-describedby={errors['assignedOutletId'] ? 'error-assignedOutletId' : undefined}
            value={formData.assignedOutletId || ''} 
            onChange={(e) => handleOutletChange(e.target.value)}
            required
          >
            <option value="">Select Outlet</option>
            {outletsList.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} ({outlet.city})
              </option>
            ))}
          </select>
            {errors['assignedOutletId'] && <small id="error-assignedOutletId" role="alert" style={{ color: '#b91c1c' }}>{errors['assignedOutletId']}</small>}
        </div>

        <div className="form-field">
          <label>Employee Code (assigned when saved)</label>
          <input aria-invalid={Boolean(errors['employeeCode'])} aria-describedby={errors['employeeCode'] ? 'error-employeeCode' : undefined}
            type="text" 
            placeholder="Select outlet first" 
            value={formData.employeeCode || ''} 
            onChange={(e) => onChange('employeeCode', e.target.value)}
            readOnly
            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
          />
            {errors['employeeCode'] && <small id="error-employeeCode" role="alert" style={{ color: '#b91c1c' }}>{errors['employeeCode']}</small>}
        </div>

        <div className="form-field">
          <label>Biometric Code</label>
          <input aria-invalid={Boolean(errors['biometricCode'])} aria-describedby={errors['biometricCode'] ? 'error-biometricCode' : undefined}
            type="text" 
            placeholder="e.g. BIO-123" 
            value={formData.biometricCode || ''} 
            onChange={(e) => onChange('biometricCode', e.target.value)}
          />
            {errors['biometricCode'] && <small id="error-biometricCode" role="alert" style={{ color: '#b91c1c' }}>{errors['biometricCode']}</small>}
        </div>

        <div className="form-field">
          <label>Joining Date*</label>
          <input aria-invalid={Boolean(errors['joiningDate'])} aria-describedby={errors['joiningDate'] ? 'error-joiningDate' : undefined}
            type="date" 
            value={formData.joiningDate || ''} 
            onChange={(e) => onChange('joiningDate', e.target.value)}
            required
          />
            {errors['joiningDate'] && <small id="error-joiningDate" role="alert" style={{ color: '#b91c1c' }}>{errors['joiningDate']}</small>}
        </div>

        <div className="form-field">
          <label>App User Role*</label>
          <select aria-invalid={Boolean(errors['role'])} aria-describedby={errors['role'] ? 'error-role' : undefined}
            value={formData.role || ''}
            onChange={(e) => onChange('role', e.target.value)}
            required
          >
            <option value="">Select Role</option>
            {rolesList.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
            {errors['role'] && <small id="error-role" role="alert" style={{ color: '#b91c1c' }}>{errors['role']}</small>}
        </div>
      </div>
    </div>
  );
};
