import { database } from '@wakeops/database';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const membership = await database.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: { organizationId: true },
  });
  if (!membership) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  const receipt = await database.monitoringWebhookTest.findFirst({
    where: { organizationId: membership.organizationId, source: 'GRAFANA' },
    orderBy: { receivedAt: 'desc' },
    select: {
      id: true,
      receiver: true,
      status: true,
      alertCount: true,
      alertName: true,
      payloadPreview: true,
      receivedAt: true,
    },
  });
  return NextResponse.json({
    receipt: receipt ? { ...receipt, receivedAt: receipt.receivedAt.toISOString() } : null,
  });
}
