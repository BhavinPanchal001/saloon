import React from 'react';
import { Plus } from 'lucide-react';

export const EmploymentSection: React.FC = () => {
  return (
    <div>
      <h3 className="form-section-title">Job Details</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Employee Code*</label>
          <input type="text" placeholder="EMP-001" />
        </div>
        <div className="form-field">
          <label>Biometric Code</label>
          <input type="text" placeholder="BIO-123" />
        </div>
        <div className="form-field">
          <label>Company Email</label>
          <input type="email" placeholder="john.doe@company.com" />
        </div>
        <div className="form-field">
          <label>Joining Date*</label>
          <input type="date" />
        </div>
        <div className="form-field">
          <label>Employment Type</label>
          <select>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
          </select>
        </div>
        <div className="form-field">
          <label>Employment Status</label>
          <select>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Probation">Probation</option>
          </select>
        </div>
      </div>

      <h3 className="form-section-title">Organization</h3>
      <div className="form-grid">
        <div className="form-field">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            Department
            <span style={{ color: 'var(--emp-primary)', cursor: 'pointer', fontSize: '0.75rem' }}>+ Add New</span>
          </label>
          <select>
            <option value="">Select Department</option>
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="HR">HR</option>
          </select>
        </div>
        <div className="form-field">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            Designation
            <span style={{ color: 'var(--emp-primary)', cursor: 'pointer', fontSize: '0.75rem' }}>+ Add New</span>
          </label>
          <select>
            <option value="">Select Designation</option>
            <option value="Software Engineer">Software Engineer</option>
            <option value="Manager">Manager</option>
          </select>
        </div>
        <div className="form-field">
          <label>Work Location</label>
          <input type="text" placeholder="New York Office" />
        </div>
        <div className="form-field">
          <label>Reporting Manager</label>
          <select>
            <option value="">Select Manager</option>
            <option value="1">Jane Smith (Head of Engineering)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
