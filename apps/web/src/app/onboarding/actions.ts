'use server';

import { database, MembershipRole, Prisma } from '@wakeops/database';
import { organizationNameSchema, toOrganizationSlug } from '@wakeops/shared';
import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

export type CreateOrganizationState = {
  error?: string;
};

export async function createOrganization(
  _previousState: CreateOrganizationState,
  formData: FormData,
): Promise<CreateOrganizationState> {
  const session = await auth();
  if (!session?.user.id) redirect('/login');

  const existingMembership = await database.membership.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (existingMembership) redirect('/dashboard');

  const result = organizationNameSchema.safeParse(formData.get('name'));
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Enter a valid organization name.' };
  }

  const slugBase = toOrganizationSlug(result.data);
  if (!slugBase) return { error: 'Enter a name containing letters or numbers.' };

  try {
    await database.organization.create({
      data: {
        name: result.data,
        slug: `${slugBase}-${randomBytes(3).toString('hex')}`,
        memberships: {
          create: { userId: session.user.id, role: MembershipRole.ADMIN },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'That organization could not be created. Please try again.' };
    }
    throw error;
  }

  redirect('/dashboard');
}
