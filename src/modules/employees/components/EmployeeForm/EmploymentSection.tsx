import React, { useState, useEffect } from 'react';
import { fetchOutlets, fetchRoles } from '../../../../services/api';

interface EmploymentSectionProps {
  formData: any;
  onChange: (field: string, value: any) => void;
}

export const EmploymentSection: React.FC<EmploymentSectionProps> = ({ 
  formData, 
  onChange 
}) => {
  const [outletsList, setOutletsList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [outletsData, rolesData] = await Promise.all([
          fetchOutlets(),
          fetchRoles()
        ]);
        setOutletsList(outletsData);
        setRolesList(rolesData.filter((r: any) => r.isActive));
      } catch (err) {
        console.error('Failed to load masters in EmploymentSection:', err);
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

    const selectedOutlet = outletsList.find(o => o.id === outletId);
    if (selectedOutlet) {
      const prefix = selectedOutlet.employeeCodePrefix || selectedOutlet.code || 'EMP';
      const nextCount = (selectedOutlet.employeeCount || 0) + 1;
      const formattedCode = `${prefix}-${String(nextCount).padStart(3, '0')}`;
      onChange('employeeCode', formattedCode);
    }
  };

  const handleRoleChange = (roleId: string) => {
    onChange('roleId', roleId);
    const selectedRole = rolesList.find(r => r.id === roleId);
    if (selectedRole) {
      onChange('role', selectedRole.name);
    } else {
      onChange('role', '');
    }
  };

  return (
    <div>
      <h3 className="form-section-title">Job Details</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Work Location / Outlet*</label>
          <select 
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
        </div>

        <div className="form-field">
          <label>Employee Code* (Auto-generated)</label>
          <input 
            type="text" 
            placeholder="Select outlet first" 
            value={formData.employeeCode || ''} 
            onChange={(e) => onChange('employeeCode', e.target.value)}
            readOnly
            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-field">
          <label>Biometric Code</label>
          <input 
            type="text" 
            placeholder="e.g. BIO-123" 
            value={formData.biometricCode || ''} 
            onChange={(e) => onChange('biometricCode', e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Joining Date*</label>
          <input 
            type="date" 
            value={formData.joiningDate || ''} 
            onChange={(e) => onChange('joiningDate', e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>Role (from Master)*</label>
          <select 
            value={formData.roleId || ''} 
            onChange={(e) => handleRoleChange(e.target.value)}
            required
          >
            <option value="">Select Role</option>
            {rolesList.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
