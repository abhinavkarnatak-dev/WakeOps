import { describe, expect, it } from 'vitest';
import { engineerSchema, maskPhoneNumber, serviceDeploymentSchema } from './setup.js';

describe('setup validation', () => {
  it('rejects a local phone number', () => {
    expect(
      engineerSchema.safeParse({
        name: 'Engineer',
        email: 'a@example.com',
        phoneNumber: '9876543210',
      }).success,
    ).toBe(false);
  });
  it('rejects duplicate escalation contacts', () => {
    expect(
      serviceDeploymentSchema.safeParse({
        resourceId: 'host',
        applicationId: 'app',
        environmentId: 'env',
        primaryEngineerId: 'eng',
        secondaryEngineerId: 'eng',
      }).success,
    ).toBe(false);
  });
  it('masks the middle of a phone number', () => {
    expect(maskPhoneNumber('+919876543210')).toBe('+91******3210');
  });
});
