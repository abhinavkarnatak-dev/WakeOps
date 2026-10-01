import { createHash } from 'node:crypto';

import { database } from '@wakeops/database';
import { encryptSecret } from '@wakeops/notifications';
import { NextRequest, NextResponse } from 'next/server';

import { requireSlackConfig } from '@/lib/slack';

export async function GET(request: NextRequest) {
  const target = new URL('/dashboard/integrations', process.env.WEB_URL ?? 'http://localhost:3000');
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state || request.nextUrl.searchParams.has('error')) {
    target.searchParams.set('slack', 'oauth-error');
    return NextResponse.redirect(target);
  }
  const stateHash = createHash('sha256').update(state).digest('hex');
  const savedState = await database.oAuthConnectionState.findUnique({ where: { stateHash } });
  if (!savedState || savedState.provider !== 'SLACK' || savedState.expiresAt < new Date()) {
    target.searchParams.set('slack', 'state-error');
    return NextResponse.redirect(target);
  }
  try {
    const config = requireSlackConfig();
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    const body = (await response.json()) as {
      ok: boolean;
      access_token?: string;
      scope?: string;
      bot_user_id?: string;
      team?: { id?: string; name?: string };
      error?: string;
    };
    if (!response.ok || !body.ok || !body.access_token || !body.team?.id || !body.team.name) {
      throw new Error(body.error ?? 'Slack OAuth failed.');
    }
    await database.$transaction(async (tx) => {
      await tx.oAuthConnectionState.delete({ where: { stateHash } });
      await tx.slackInstallation.upsert({
        where: { organizationId: savedState.organizationId },
        create: {
          organizationId: savedState.organizationId,
          teamId: body.team!.id!,
          teamName: body.team!.name!,
          botUserId: body.bot_user_id,
          scopes: body.scope ?? '',
          accessTokenEncrypted: encryptSecret(body.access_token!, config.encryptionKey),
        },
        update: {
          teamId: body.team!.id!,
          teamName: body.team!.name!,
          botUserId: body.bot_user_id,
          scopes: body.scope ?? '',
          accessTokenEncrypted: encryptSecret(body.access_token!, config.encryptionKey),
          connectedAt: new Date(),
        },
      });
    });
    target.searchParams.set('slack', 'connected');
  } catch {
    target.searchParams.set('slack', 'oauth-error');
  }
  return NextResponse.redirect(target);
}
