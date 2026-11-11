import { splitEmployeePhone, validateEmployeePhone } from './employeePhone.js';
import { getAppRole } from './appRoles.js';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const namePattern = /^(?=.*\p{L})[\p{L}\p{M} .'’\-]+$/u;
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const validEmail = value => {
  if (!emailPattern.test(value) || value.length > 150) return false;
  const [local, domain] = value.split('@');
  return local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..')
    && !/[(),:;<>\[\]\\"]/.test(local)
    && domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
};
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export const fieldTab = (field) => field.startsWith('bankDetails.') ? 'bank'
  : ['email', 'password', 'accountEnabled'].includes(field) ? 'auth'
  : ['role', 'roleId', 'assignedOutletId', 'joiningDate', 'biometricCode', 'onboardingStatus'].includes(field) ? 'employment' : 'profile';

export function normalizeEmployee(input = {}) {
  const data = { ...input, address: { ...input.address }, bankDetails: { ...input.bankDetails } };
  for (const field of ['firstName', 'middleName', 'lastName', 'phone', 'email', 'personalEmail', 'dob', 'gender', 'joiningDate', 'biometricCode']) data[field] = text(input[field]);
  data.maritalStatus = text(input.maritalStatus ?? input.marital_status);
  data.email = data.email.toLowerCase();
  data.personalEmail = data.personalEmail.toLowerCase();
  const phoneParts = splitEmployeePhone(data.phone, input.phoneCountryCode, input.phoneCountry);
  data.phoneCountryCode = phoneParts.phoneCountryCode;
  data.phoneCountry = phoneParts.phoneCountry;
  data.phone = phoneParts.phoneCountryCode + phoneParts.phone;
  data.address.country = text(data.address.country) || 'IN';
  for (const key of ['street', 'city', 'state', 'pincode']) data.address[key] = text(data.address[key]);
  for (const key of ['accountHolderName', 'bankName', 'accountNumber', 'confirmAccountNumber', 'ifscCode', 'branchName', 'accountType']) data.bankDetails[key] = text(data.bankDetails[key]);
  data.bankDetails.ifscCode = data.bankDetails.ifscCode.toUpperCase();
  return data;
}

export function validateEmployee(input, { isEditing = false, today = new Date().toLocaleDateString('en-CA') } = {}) {
  const data = normalizeEmployee(input);
  const errors = {};
  const name = (field, value, label, required, max = 150) => {
    if (!value && required) errors[field] = `${label} is required.`;
    else if (value && (!namePattern.test(value) || value.length > max)) errors[field] = `${label} must contain letters, spaces, apostrophes, dots or hyphens and be at most ${max} characters.`;
  };
  name('firstName', data.firstName, 'First name', true);
  name('middleName', data.middleName, 'Middle name', false);
  name('lastName', data.lastName, 'Last name', true);
  if ([data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ').length > 100) errors.firstName = 'Full name must be at most 100 characters for the user account.';
  for (const [field, required, label] of [['personalEmail', true, 'Personal email'], ['email', false, 'Login email']]) {
    if (!data[field] && required) errors[field] = `${label} is required.`;
    else if (data[field] && !validEmail(data[field])) errors[field] = `Enter a valid ${label.toLowerCase()} (at most 150 characters).`;
  }
  const india = ['IN', 'India'].includes(data.address.country);
  Object.assign(errors, validateEmployeePhone(data.phone, data.phoneCountryCode, data.phoneCountry));
  if (data.dob && (!validDate(data.dob) || data.dob >= today)) errors.dob = 'Date of birth must be a valid date before today.';
  if (!validDate(data.joiningDate)) errors.joiningDate = 'A valid joining date is required.';
  else if (data.dob && validDate(data.dob) && data.joiningDate <= data.dob) errors.joiningDate = 'Joining date must be after date of birth.';
  if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) errors.gender = 'Select a valid gender.';
  if (data.maritalStatus && !['Single', 'Married', 'Divorced', 'Widowed'].includes(data.maritalStatus)) errors.maritalStatus = 'Select a valid marital status or leave it blank.';
  if (!getAppRole(data.role)) errors.role = 'Select Outlet Manager, Cashier / POS Operator, Admin or Super Admin.';
  if (!/^[1-9]\d*$/.test(String(data.assignedOutletId ?? ''))) errors.assignedOutletId = 'Select a valid outlet.';
  if (data.biometricCode.length > 100) errors.biometricCode = 'Biometric code must be at most 100 characters.';
  for (const [key, max] of [['street', 1000], ['city', 100], ['state', 100], ['pincode', 20]]) if (data.address[key].length > max) errors[`address.${key}`] = `${key} must be at most ${max} characters.`;
  if (!['IN', 'India', 'US', 'UK'].includes(data.address.country)) errors['address.country'] = 'Select a valid country.';
  const postal = india ? /^[1-9]\d{5}$/ : data.address.country === 'US' ? /^\d{5}(?:-\d{4})?$/ : /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
  if (data.address.pincode && !postal.test(data.address.pincode)) errors['address.pincode'] = 'Enter a valid postal code for the selected country.';
  const bank = data.bankDetails;
  name('bankDetails.accountHolderName', bank.accountHolderName, 'Account holder name', true, 200);
  if (!bank.bankName || bank.bankName.length > 200) errors['bankDetails.bankName'] = 'Bank name is required (at most 200 characters).';
  if (!/^\d{9,18}$/.test(bank.accountNumber)) errors['bankDetails.accountNumber'] = 'Account number must contain 9–18 digits.';
  if (!bank.confirmAccountNumber || bank.accountNumber !== bank.confirmAccountNumber) errors['bankDetails.confirmAccountNumber'] = 'Bank account numbers must match.';
  if (!(india ? /^[A-Z]{4}0[A-Z0-9]{6}$/ : /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/).test(bank.ifscCode)) errors['bankDetails.ifscCode'] = india ? 'Enter a valid 11-character IFSC, such as SBIN0001234.' : 'Enter a valid 8- or 11-character SWIFT code.';
  if (bank.branchName.length > 200) errors['bankDetails.branchName'] = 'Branch name must be at most 200 characters.';
  if (!['Savings', 'Current'].includes(bank.accountType)) errors['bankDetails.accountType'] = 'Select Savings or Current.';
  const password = input.password;
  if (!isEditing && !password) errors.password = 'An initial password is required to create the user account.';
  else if (password && (typeof password !== 'string' || password.length < 8 || new TextEncoder().encode(password).length > 72 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))) errors.password = 'Password needs at least 8 characters, an uppercase letter, a lowercase letter and a number (maximum 72 bytes).';
  if (input.accountEnabled !== undefined && typeof input.accountEnabled !== 'boolean') errors.accountEnabled = 'Select a valid account status.';
  if (input.onboardingStatus && !['pending', 'contract_accepted', 'document_uploaded', 'approved'].includes(input.onboardingStatus)) errors.onboardingStatus = 'Select a valid onboarding status.';
  return errors;
}
