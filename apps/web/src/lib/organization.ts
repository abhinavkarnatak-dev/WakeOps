import { database } from '@wakeops/database';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export async function requireOrganization() {
  const session = await auth();
  if (!session?.user.id) redirect('/login');
  const membership = await database.membership.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!membership) redirect('/onboarding');
  return membership;
}
