import React from 'react';
import { Camera } from 'lucide-react';

export const ProfileSection: React.FC = () => {
  return (
    <div>
      <h3 className="form-section-title">Personal Information</h3>
      
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '16px', 
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #cbd5e1',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <Camera size={32} color="#94a3b8" />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Upload Photo</p>
        </div>

        <div style={{ flex: 1 }} className="form-grid">
          <div className="form-field">
            <label>First Name*</label>
            <input type="text" placeholder="e.g. John" />
          </div>
          <div className="form-field">
            <label>Last Name*</label>
            <input type="text" placeholder="e.g. Doe" />
          </div>
          <div className="form-field">
            <label>Personal Email*</label>
            <input type="email" placeholder="john.doe@example.com" />
          </div>
          <div className="form-field">
            <label>Phone Number*</label>
            <input type="tel" placeholder="+1 (555) 000-0000" />
          </div>
          <div className="form-field">
            <label>Date of Birth</label>
            <input type="date" />
          </div>
          <div className="form-field">
            <label>Gender</label>
            <select>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <h3 className="form-section-title">Address Details</h3>
      <div className="form-grid">
        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label>Street Address</label>
          <input type="text" placeholder="123 Business Way" />
        </div>
        <div className="form-field">
          <label>City</label>
          <input type="text" />
        </div>
        <div className="form-field">
          <label>State / Province</label>
          <input type="text" />
        </div>
        <div className="form-field">
          <label>Country</label>
          <select defaultValue="US">
            <option value="US">United States</option>
            <option value="IN">India</option>
            <option value="UK">United Kingdom</option>
          </select>
        </div>
        <div className="form-field">
          <label>Pincode / Zip</label>
          <input type="text" />
        </div>
      </div>
    </div>
  );
};
