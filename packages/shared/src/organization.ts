import { z } from 'zod';

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, 'Organization name must contain at least 2 characters.')
  .max(80, 'Organization name must contain at most 80 characters.');

export function toOrganizationSlug(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
