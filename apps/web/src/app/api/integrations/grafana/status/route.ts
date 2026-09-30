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

  const [receipt, processing] = await Promise.all([
    database.monitoringWebhookTest.findFirst({
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
    }),
    database.alertEvent.findFirst({
      where: { organizationId: membership.organizationId, source: 'GRAFANA' },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        processingStatus: true,
        mappingError: true,
        alertName: true,
        resourceIdentifier: true,
        service: true,
        environment: true,
        severity: true,
        receivedAt: true,
        incident: {
          select: {
            id: true,
            status: true,
            metadata: true,
            application: { select: { name: true } },
            environment: { select: { name: true } },
            resource: { select: { name: true, externalIdentifier: true } },
          },
        },
      },
    }),
  ]);
  return NextResponse.json({
    receipt: receipt ? { ...receipt, receivedAt: receipt.receivedAt.toISOString() } : null,
    processing: processing
      ? { ...processing, receivedAt: processing.receivedAt.toISOString() }
      : null,
  });
}
