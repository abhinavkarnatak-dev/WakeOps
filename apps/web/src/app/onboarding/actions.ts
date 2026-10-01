'use server';

import { database, MembershipRole, Prisma } from '@wakeops/database';
import { nextOrganizationSlug, organizationNameSchema, toOrganizationSlug } from '@wakeops/shared';
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

  let created = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await database.organization.findMany({
      where: { OR: [{ slug: slugBase }, { slug: { startsWith: `${slugBase}-` } }] },
      select: { slug: true },
    });
    const slug = nextOrganizationSlug(
      slugBase,
      existing.map((organization) => organization.slug),
    );

    try {
      await database.organization.create({
        data: {
          name: result.data,
          slug,
          memberships: {
            create: { userId: session.user.id, role: MembershipRole.ADMIN },
          },
        },
      });
      created = true;
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const target = error.meta?.target;
      const slugConflict = Array.isArray(target)
        ? target.includes('slug')
        : String(target ?? '').includes('slug');
      if (!slugConflict) {
        return { error: 'That organization could not be created. Please try again.' };
      }
    }
  }

  if (!created) return { error: 'That organization name is busy. Please try again.' };
  redirect('/dashboard');
}
