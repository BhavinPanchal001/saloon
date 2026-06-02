import React from 'react';
import { Camera } from 'lucide-react';

interface ProfileSectionProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  onAddressChange: (field: string, value: any) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ 
  formData, 
  onChange, 
  onAddressChange 
}) => {
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
            <input 
              type="text" 
              placeholder="e.g. John" 
              value={formData.firstName || ''} 
              onChange={(e) => onChange('firstName', e.target.value)} 
              required
            />
          </div>
          <div className="form-field">
            <label>Middle Name</label>
            <input 
              type="text" 
              placeholder="e.g. Robert" 
              value={formData.middleName || ''} 
              onChange={(e) => onChange('middleName', e.target.value)} 
            />
          </div>
          <div className="form-field">
            <label>Last Name*</label>
            <input 
              type="text" 
              placeholder="e.g. Doe" 
              value={formData.lastName || ''} 
              onChange={(e) => onChange('lastName', e.target.value)} 
              required
            />
          </div>
          <div className="form-field">
            <label>Personal Email*</label>
            <input 
              type="email" 
              placeholder="john.doe@example.com" 
              value={formData.personalEmail || ''} 
              onChange={(e) => onChange('personalEmail', e.target.value)} 
              required
            />
          </div>
          <div className="form-field">
            <label>Phone Number*</label>
            <input 
              type="tel" 
              placeholder="+91 99999 99999" 
              value={formData.phone || ''} 
              onChange={(e) => onChange('phone', e.target.value)} 
              required
            />
          </div>
          <div className="form-field">
            <label>Date of Birth</label>
            <input 
              type="date" 
              value={formData.dob || ''} 
              onChange={(e) => onChange('dob', e.target.value)} 
            />
          </div>
          <div className="form-field">
            <label>Gender</label>
            <select 
              value={formData.gender || ''} 
              onChange={(e) => onChange('gender', e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label>Marital Status*</label>
            <select 
              value={formData.maritalStatus || ''} 
              onChange={(e) => onChange('maritalStatus', e.target.value)}
              required
            >
              <option value="">Select Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
        </div>
      </div>

      <h3 className="form-section-title">Address Details</h3>
      <div className="form-grid">
        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label>Street Address</label>
          <input 
            type="text" 
            placeholder="123 Business Way" 
            value={formData.address?.street || ''} 
            onChange={(e) => onAddressChange('street', e.target.value)} 
          />
        </div>
        <div className="form-field">
          <label>City</label>
          <input 
            type="text" 
            value={formData.address?.city || ''} 
            onChange={(e) => onAddressChange('city', e.target.value)} 
          />
        </div>
        <div className="form-field">
          <label>State / Province</label>
          <input 
            type="text" 
            value={formData.address?.state || ''} 
            onChange={(e) => onAddressChange('state', e.target.value)} 
          />
        </div>
        <div className="form-field">
          <label>Country</label>
          <select 
            value={formData.address?.country || 'IN'} 
            onChange={(e) => onAddressChange('country', e.target.value)}
          >
            <option value="IN">India</option>
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
          </select>
        </div>
        <div className="form-field">
          <label>Pincode / Zip</label>
          <input 
            type="text" 
            value={formData.address?.pincode || ''} 
            onChange={(e) => onAddressChange('pincode', e.target.value)} 
          />
        </div>
      </div>
    </div>
  );
};
