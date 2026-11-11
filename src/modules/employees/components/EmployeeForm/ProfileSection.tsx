import React, { useState } from 'react';
import { phoneCountryOptions, validateEmployeePhone, digitsOnly } from '../../../../../shared/employeePhone.js';
import { PhoneCountryPicker } from './PhoneCountryPicker';
import { Camera } from 'lucide-react';

interface ProfileSectionProps {
  formData: any;
  errors?: Record<string, string>;
  onChange: (field: string, value: any) => void;
  onAddressChange: (field: string, value: any) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ 
  errors = {},
  formData, 
  onChange, 
  onAddressChange 
}) => {
  const [phoneTouched, setPhoneTouched] = useState(false);
  const selectedCountry = phoneCountryOptions.find(country => country.country === formData.phoneCountry);
  const phoneErrors = phoneTouched ? validateEmployeePhone(formData.phone, formData.phoneCountryCode, formData.phoneCountry) : {};
  const phoneError = errors.phone || phoneErrors.phone;
  const codeError = errors.phoneCountryCode || phoneErrors.phoneCountryCode;
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
            <input aria-invalid={Boolean(errors['firstName'])} aria-describedby={errors['firstName'] ? 'error-firstName' : undefined}
              type="text" 
              placeholder="e.g. John" 
              value={formData.firstName || ''} 
              onChange={(e) => onChange('firstName', e.target.value)} 
              required
            />
            {errors['firstName'] && <small id="error-firstName" role="alert" style={{ color: '#b91c1c' }}>{errors['firstName']}</small>}
          </div>
          <div className="form-field">
            <label>Middle Name</label>
            <input aria-invalid={Boolean(errors['middleName'])} aria-describedby={errors['middleName'] ? 'error-middleName' : undefined}
              type="text" 
              placeholder="e.g. Robert" 
              value={formData.middleName || ''} 
              onChange={(e) => onChange('middleName', e.target.value)} 
            />
            {errors['middleName'] && <small id="error-middleName" role="alert" style={{ color: '#b91c1c' }}>{errors['middleName']}</small>}
          </div>
          <div className="form-field">
            <label>Last Name*</label>
            <input aria-invalid={Boolean(errors['lastName'])} aria-describedby={errors['lastName'] ? 'error-lastName' : undefined}
              type="text" 
              placeholder="e.g. Doe" 
              value={formData.lastName || ''} 
              onChange={(e) => onChange('lastName', e.target.value)} 
              required
            />
            {errors['lastName'] && <small id="error-lastName" role="alert" style={{ color: '#b91c1c' }}>{errors['lastName']}</small>}
          </div>
          <div className="form-field">
            <label>Personal Email*</label>
            <input aria-invalid={Boolean(errors['personalEmail'])} aria-describedby={errors['personalEmail'] ? 'error-personalEmail' : undefined}
              type="email" 
              placeholder="john.doe@example.com" 
              value={formData.personalEmail || ''} 
              onChange={(e) => onChange('personalEmail', e.target.value)} 
              required
            />
            {errors['personalEmail'] && <small id="error-personalEmail" role="alert" style={{ color: '#b91c1c' }}>{errors['personalEmail']}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="employee-phone">Phone Number*</label>
            <div className={`employee-phone-control ${phoneError || codeError ? 'has-error' : ''}`}>
              <PhoneCountryPicker
                value={formData.phoneCountry || ''}
                invalid={Boolean(codeError)}
                onChange={country => {
                  onChange('phoneCountry', country.country);
                  onChange('phoneCountryCode', country.code);
                }}
              />
              <input
                id="employee-phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel-national"
                disabled={!selectedCountry}
                maxLength={selectedCountry?.length}
                placeholder={selectedCountry ? 'Phone number' : 'Select a country first'}
                value={formData.phone || ''}
                onChange={e => onChange('phone', digitsOnly(e.target.value))}
                onBlur={() => setPhoneTouched(true)}
                onPaste={e => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').trim();
                  if (!/^[+\d\s()\-]+$/.test(pasted)) {
                    setPhoneTouched(true);
                    return;
                  }
                  let digits = digitsOnly(pasted);
                  if (pasted.startsWith('+') && selectedCountry && digits.startsWith(selectedCountry.code.slice(1))) digits = digits.slice(selectedCountry.code.length - 1);
                  const input = e.currentTarget;
                  const current = formData.phone || '';
                  const next = current.slice(0, input.selectionStart ?? current.length) + digits + current.slice(input.selectionEnd ?? current.length);
                  onChange('phone', next);
                  setPhoneTouched(true);
                }}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? 'error-phone' : 'employee-phone-help'}
                className="employee-phone-number"
                required
              />
            </div>
            <small id="employee-phone-help">{selectedCountry ? selectedCountry.hint + '. Do not include ' + selectedCountry.code + ' again.' : 'Choose the phone country code first.'}</small>
            {codeError && <small id="error-phoneCountryCode" role="alert" style={{ color: '#b91c1c' }}>{codeError}</small>}
            {phoneError && <small id="error-phone" role="alert" style={{ color: '#b91c1c' }}>{phoneError}</small>}
          </div>
          <div className="form-field">
            <label>Date of Birth</label>
            <input aria-invalid={Boolean(errors['dob'])} aria-describedby={errors['dob'] ? 'error-dob' : undefined}
              type="date" 
              value={formData.dob || ''} 
              onChange={(e) => onChange('dob', e.target.value)} 
            />
            {errors['dob'] && <small id="error-dob" role="alert" style={{ color: '#b91c1c' }}>{errors['dob']}</small>}
          </div>
          <div className="form-field">
            <label>Gender</label>
            <select aria-invalid={Boolean(errors['gender'])} aria-describedby={errors['gender'] ? 'error-gender' : undefined}
              value={formData.gender || ''} 
              onChange={(e) => onChange('gender', e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors['gender'] && <small id="error-gender" role="alert" style={{ color: '#b91c1c' }}>{errors['gender']}</small>}
          </div>
          <div className="form-field">
            <label>Marital Status (optional)</label>
            <select aria-invalid={Boolean(errors['maritalStatus'])} aria-describedby={errors['maritalStatus'] ? 'error-maritalStatus' : undefined}
              value={formData.maritalStatus || ''} 
              onChange={(e) => onChange('maritalStatus', e.target.value)}
            >
              <option value="">Select Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
            {errors['maritalStatus'] && <small id="error-maritalStatus" role="alert" style={{ color: '#b91c1c' }}>{errors['maritalStatus']}</small>}
          </div>
        </div>
      </div>

      <h3 className="form-section-title">Address Details</h3>
      <div className="form-grid">
        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label>Street Address</label>
          <input aria-invalid={Boolean(errors['address.street'])} aria-describedby={errors['address.street'] ? 'error-address.street' : undefined}
            type="text" 
            placeholder="123 Business Way" 
            value={formData.address?.street || ''} 
            onChange={(e) => onAddressChange('street', e.target.value)} 
          />
            {errors['address.street'] && <small id="error-address.street" role="alert" style={{ color: '#b91c1c' }}>{errors['address.street']}</small>}
        </div>
        <div className="form-field">
          <label>City</label>
          <input aria-invalid={Boolean(errors['address.city'])} aria-describedby={errors['address.city'] ? 'error-address.city' : undefined}
            type="text" 
            value={formData.address?.city || ''} 
            onChange={(e) => onAddressChange('city', e.target.value)} 
          />
            {errors['address.city'] && <small id="error-address.city" role="alert" style={{ color: '#b91c1c' }}>{errors['address.city']}</small>}
        </div>
        <div className="form-field">
          <label>State / Province</label>
          <input aria-invalid={Boolean(errors['address.state'])} aria-describedby={errors['address.state'] ? 'error-address.state' : undefined}
            type="text" 
            value={formData.address?.state || ''} 
            onChange={(e) => onAddressChange('state', e.target.value)} 
          />
            {errors['address.state'] && <small id="error-address.state" role="alert" style={{ color: '#b91c1c' }}>{errors['address.state']}</small>}
        </div>
        <div className="form-field">
          <label>Country</label>
          <select aria-invalid={Boolean(errors['address.country'])} aria-describedby={errors['address.country'] ? 'error-address.country' : undefined}
            value={formData.address?.country || 'IN'} 
            onChange={(e) => onAddressChange('country', e.target.value)}
          >
            <option value="IN">India</option>
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
          </select>
            {errors['address.country'] && <small id="error-address.country" role="alert" style={{ color: '#b91c1c' }}>{errors['address.country']}</small>}
        </div>
        <div className="form-field">
          <label>Pincode / Zip</label>
          <input aria-invalid={Boolean(errors['address.pincode'])} aria-describedby={errors['address.pincode'] ? 'error-address.pincode' : undefined}
            type="text" 
            value={formData.address?.pincode || ''} 
            onChange={(e) => onAddressChange('pincode', e.target.value)} 
          />
            {errors['address.pincode'] && <small id="error-address.pincode" role="alert" style={{ color: '#b91c1c' }}>{errors['address.pincode']}</small>}
        </div>
      </div>
    </div>
  );
};
