import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/max';

const names = new Intl.DisplayNames(['en'], { type: 'region' });
export const phoneCountryOptions = getCountries().map(country => {
  const code = '+' + getCountryCallingCode(country);
  const name = names.of(country) || country;
  return { country, code, name, label: name + ' (' + code + ')', length: 15 - code.length + 1, hint: 'Enter the national number using digits only', example: 'Phone number', flag: String.fromCodePoint(...[...country].map(letter => 127397 + letter.charCodeAt(0))) };
}).sort((a, b) => a.name.localeCompare(b.name));

export function splitEmployeePhone(value = '', selectedCode, selectedCountry) {
  const compact = String(value).trim().replace(/[\s()\-]/g, '');
  const parsed = compact.startsWith('+') ? parsePhoneNumberFromString(compact) : undefined;
  const matched = phoneCountryOptions.find(option => option.country === selectedCountry)
    || phoneCountryOptions.find(option => option.country === parsed?.country)
    || phoneCountryOptions.find(option => compact.startsWith(option.code));
  const phoneCountryCode = selectedCode ?? matched?.code ?? (compact.startsWith('+') ? '' : '+91');
  const phoneCountry = selectedCountry || (matched?.code === phoneCountryCode ? matched.country : undefined)
    || (phoneCountryCode === '+91' ? 'IN' : phoneCountryCode === '+1' ? 'US' : phoneCountryOptions.find(option => option.code === phoneCountryCode)?.country) || '';
  const phone = phoneCountryCode && compact.startsWith(phoneCountryCode) ? compact.slice(phoneCountryCode.length) : compact;
  return { phoneCountryCode, phoneCountry, phone };
}

export function validateEmployeePhone(phone, selectedCode, selectedCountry) {
  const parts = splitEmployeePhone(phone, selectedCode, selectedCountry);
  const country = phoneCountryOptions.find(option => option.country === parts.phoneCountry && option.code === parts.phoneCountryCode);
  if (!country) return { phoneCountryCode: 'Select a country and calling code.' };
  if (!/^\d+$/.test(parts.phone)) return { phone: 'Enter a phone number using digits only.' };
  const parsed = parsePhoneNumberFromString(country.code + parts.phone);
  if (!parsed?.isValid() || parsed.nationalNumber !== parts.phone || !['MOBILE', 'FIXED_LINE_OR_MOBILE'].includes(parsed.getType())) return { phone: 'Enter a valid mobile number for ' + country.name + ' (' + country.code + ').' };
  return {};
}

export const digitsOnly = value => String(value).replace(/\D/g, '');
