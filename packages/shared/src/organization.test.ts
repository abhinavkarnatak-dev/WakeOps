import { describe, expect, it } from 'vitest';

import { organizationNameSchema, toOrganizationSlug } from './organization.js';

describe('organization onboarding helpers', () => {
  it('creates a URL-safe slug', () => {
    expect(toOrganizationSlug('Acme Payments & API')).toBe('acme-payments-api');
  });

  it('rejects names that are too short', () => {
    expect(organizationNameSchema.safeParse('A').success).toBe(false);
  });
});
