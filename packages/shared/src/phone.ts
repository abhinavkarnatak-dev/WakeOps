import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const phoneCountries = getCountries()
  .map((code) => ({
    code,
    name: displayNames.of(code) ?? code,
    callingCode: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

export function normalizeContactPhone(country: string, nationalNumber: string): string | null {
  if (
    !phoneCountries.some((item) => item.code === country) ||
    !/^[\d\s().-]+$/.test(nationalNumber)
  )
    return null;
  const parsed = parsePhoneNumberFromString(nationalNumber, {
    defaultCountry: country as CountryCode,
    extract: false,
  });
  if (
    !parsed?.isValid() ||
    parsed.ext ||
    !parsed.getPossibleCountries().includes(country as CountryCode)
  )
    return null;
  return parsed.number;
}

export function splitContactPhone(number: string, savedCountry?: string | null) {
  const parsed = parsePhoneNumberFromString(number);
  return {
    country: savedCountry ?? parsed?.country ?? 'IN',
    nationalNumber: parsed?.nationalNumber ?? '',
  };
}
