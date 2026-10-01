import { createHash, randomBytes } from 'node:crypto';

import { database } from '@wakeops/database';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { requireSlackConfig } from '@/lib/slack';

export async function GET() {
  const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
  const session = await auth();
  if (!session?.user.id) return NextResponse.redirect(new URL('/login', webUrl));
  const membership = await database.membership.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership || membership.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard/integrations?slack=forbidden', webUrl));
  }
  try {
    const config = requireSlackConfig();
    const state = randomBytes(32).toString('base64url');
    const stateHash = createHash('sha256').update(state).digest('hex');
    await database.$transaction([
      database.oAuthConnectionState.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      database.oAuthConnectionState.create({
        data: {
          stateHash,
          organizationId: membership.organizationId,
          userId: session.user.id,
          provider: 'SLACK',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      }),
    ]);
    const authorize = new URL('https://slack.com/oauth/v2/authorize');
    authorize.searchParams.set('client_id', config.clientId);
    authorize.searchParams.set('scope', 'chat:write,channels:read,groups:read');
    authorize.searchParams.set('redirect_uri', config.redirectUri);
    authorize.searchParams.set('state', state);
    return NextResponse.redirect(authorize);
  } catch {
    return NextResponse.redirect(new URL('/dashboard/integrations?slack=config-error', webUrl));
  }
}
