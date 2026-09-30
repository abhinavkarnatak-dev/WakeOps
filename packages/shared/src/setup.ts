import { z } from 'zod';
import { normalizeContactPhone } from './phone';

const name = z.string().trim().min(2, 'Enter at least 2 characters.').max(80);
const id = z.string().min(1, 'Select an option.').max(100);

export const engineerSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email.')),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use international format, such as +919876543210.'),
});

export const namedRecordSchema = z.object({ name });

export const engineerFormSchema = engineerSchema
  .omit({ phoneNumber: true })
  .extend({
    phoneCountry: z.string().length(2),
    nationalNumber: z.string().trim().min(1).max(30),
  })
  .transform((value, context) => {
    const phoneNumber = normalizeContactPhone(value.phoneCountry, value.nationalNumber);
    if (!phoneNumber) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a valid phone number for the selected country.',
        path: ['nationalNumber'],
      });
      return z.NEVER;
    }
    return { name: value.name, email: value.email, phoneCountry: value.phoneCountry, phoneNumber };
  });

const contactAssignment = z
  .object({
    primaryEngineerId: id,
    secondaryEngineerId: z.string().max(100).default(''),
  })
  .refine((value) => value.primaryEngineerId !== value.secondaryEngineerId, {
    message: 'Primary and secondary engineers must be different.',
    path: ['secondaryEngineerId'],
  });

export const hostSchema = z.object({
  name,
  externalIdentifier: z.string().trim().min(1).max(200),
});

export const serviceDeploymentSchema = contactAssignment.and(
  z.object({
    resourceId: id,
    applicationId: id,
    environmentId: id,
  }),
);

export function maskPhoneNumber(phone: string): string {
  return `${phone.slice(0, 3)}${'*'.repeat(Math.max(0, phone.length - 7))}${phone.slice(-4)}`;
}
