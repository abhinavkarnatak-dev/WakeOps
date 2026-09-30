import { describe, expect, it } from 'vitest';
import { normalizeContactPhone, phoneCountries, splitContactPhone } from './phone';

describe('country phone input', () => {
  it('provides country codes from phone metadata', () => {
    expect(phoneCountries.length).toBeGreaterThan(200);
    expect(phoneCountries.find((country) => country.code === 'IN')?.callingCode).toBe('91');
  });
  it('adds India calling code', () => {
    expect(normalizeContactPhone('IN', '9876543210')).toBe('+919876543210');
  });
  it('removes a UK national leading zero', () => {
    expect(normalizeContactPhone('GB', '020 7946 0018')).toBe('+442079460018');
  });
  it('rejects mismatched or invalid input', () => {
    expect(normalizeContactPhone('IN', '123')).toBeNull();
    expect(normalizeContactPhone('ZZ', '9876543210')).toBeNull();
    expect(normalizeContactPhone('IN', '+919876543210')).toBeNull();
  });
  it('restores saved country on edit', () => {
    expect(splitContactPhone('+919876543210', 'IN')).toEqual({
      country: 'IN',
      nationalNumber: '9876543210',
    });
  });
});
