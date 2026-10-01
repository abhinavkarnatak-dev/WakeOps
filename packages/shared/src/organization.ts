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

export function nextOrganizationSlug(base: string, existingSlugs: Iterable<string>): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
