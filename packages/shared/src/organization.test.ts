import { describe, expect, it } from 'vitest';

import {
  nextOrganizationSlug,
  organizationNameSchema,
  toOrganizationSlug,
} from './organization.js';

describe('organization onboarding helpers', () => {
  it('creates a URL-safe slug', () => {
    expect(toOrganizationSlug('Acme Payments & API')).toBe('acme-payments-api');
  });

  it('rejects names that are too short', () => {
    expect(organizationNameSchema.safeParse('A').success).toBe(false);
  });

  it('uses the readable slug when it is available', () => {
    expect(nextOrganizationSlug('test-org', [])).toBe('test-org');
  });

  it('adds the next numeric suffix when the slug is already used', () => {
    expect(nextOrganizationSlug('test-org', ['test-org', 'test-org-2', 'test-org-4'])).toBe(
      'test-org-3',
    );
  });
});
