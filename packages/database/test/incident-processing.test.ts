import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { normalizeGrafanaWebhook } from '@wakeops/integrations';
import { processAlerts } from '@wakeops/incidents';
import { afterAll, describe, expect, it } from 'vitest';

const database = new PrismaClient();
afterAll(() => database.$disconnect());

async function createSetup() {
  const organization = await database.organization.create({
    data: { name: 'Incident Test', slug: randomUUID() },
  });
  const engineer = await database.engineer.create({
    data: {
      organizationId: organization.id,
      name: 'Primary Engineer',
      email: `${randomUUID()}@example.com`,
      phoneNumber: '+919876543210',
    },
  });
  const application = await database.application.create({
    data: { organizationId: organization.id, name: 'payment-service' },
  });
  const environment = await database.environment.create({
    data: { organizationId: organization.id, name: 'production' },
  });
  const resource = await database.monitoredResource.create({
    data: {
      organizationId: organization.id,
      source: 'GRAFANA',
      externalIdentifier: 'i-111',
      name: 'Production host',
    },
  });
  const mapping = await database.resourceMapping.create({
    data: {
      organizationId: organization.id,
      resourceId: resource.id,
      applicationId: application.id,
      environmentId: environment.id,
    },
  });
  await database.onCallAssignment.create({
    data: {
      organizationId: organization.id,
      mappingId: mapping.id,
      primaryEngineerId: engineer.id,
    },
  });
  return { organization, application };
}

async function deleteTestOrganization(organizationId: string) {
  await database.incident.deleteMany({ where: { organizationId } });
  await database.onCallAssignment.deleteMany({ where: { organizationId } });
  await database.resourceMapping.deleteMany({ where: { organizationId } });
  await database.organization.delete({ where: { id: organizationId } });
}

function payload(
  status: 'firing' | 'resolved',
  value: string,
  startedAt = '2026-09-30T10:00:00.000Z',
) {
  return {
    status,
    alerts: [
      {
        status,
        fingerprint: 'grafana-alert-1',
        startsAt: startedAt,
        endsAt: status === 'resolved' ? '2026-09-30T10:10:00.000Z' : undefined,
        labels: {
          alertname: 'HighErrorRate',
          service: 'payment-service',
          environment: 'production',
          instance: 'i-111',
          severity: 'critical',
          region: 'ap-south-1',
        },
        annotations: { value, summary: 'Error rate is high' },
      },
    ],
  };
}

describe('incident processing', () => {
  it('creates, deduplicates, resolves and allows a later recurrence', async () => {
    const { organization, application } = await createSetup();
    try {
      const firing = normalizeGrafanaWebhook(payload('firing', '8.7%'), organization.id);
      expect((await processAlerts(database, firing))[0]?.outcome).toBe('INCIDENT_CREATED');
      expect((await processAlerts(database, firing))[0]?.outcome).toBe('DUPLICATE_DELIVERY');

      const changedValue = normalizeGrafanaWebhook(payload('firing', '9.2%'), organization.id);
      expect((await processAlerts(database, changedValue))[0]?.outcome).toBe('INCIDENT_UPDATED');

      const active = await database.incident.findFirst({
        where: { organizationId: organization.id, status: 'OPEN' },
        include: { alertEvents: true, auditEvents: true },
      });
      expect(active).toMatchObject({ applicationId: application.id, value: '9.2%' });
      expect(active?.alertEvents).toHaveLength(2);
      expect(active?.auditEvents.map((event) => event.type)).toEqual([
        'ALERT_RECEIVED',
        'INCIDENT_CREATED',
        'ALERT_RECEIVED',
        'ALERT_DEDUPLICATED',
      ]);

      const resolved = normalizeGrafanaWebhook(payload('resolved', '0.2%'), organization.id);
      expect((await processAlerts(database, resolved))[0]?.outcome).toBe('INCIDENT_RESOLVED');
      expect(
        await database.incident.count({
          where: { organizationId: organization.id, status: 'RESOLVED' },
        }),
      ).toBe(1);

      const recurrence = normalizeGrafanaWebhook(
        payload('firing', '8.9%', '2026-09-30T12:00:00.000Z'),
        organization.id,
      );
      expect((await processAlerts(database, recurrence))[0]?.outcome).toBe('INCIDENT_CREATED');
      expect(await database.incident.count({ where: { organizationId: organization.id } })).toBe(2);
    } finally {
      await deleteTestOrganization(organization.id);
    }
  });

  it('stores a clear mapping failure without creating an incident', async () => {
    const organization = await database.organization.create({
      data: { name: 'Mapping Test', slug: randomUUID() },
    });
    try {
      const alerts = normalizeGrafanaWebhook(payload('firing', '8.7%'), organization.id);
      const [result] = await processAlerts(database, alerts);
      expect(result).toMatchObject({
        outcome: 'MAPPING_FAILED',
        incidentId: null,
        message: 'No monitored host matches instance "i-111".',
      });
      expect(await database.incident.count({ where: { organizationId: organization.id } })).toBe(0);
      expect(
        await database.alertEvent.findFirst({ where: { organizationId: organization.id } }),
      ).toMatchObject({ processingStatus: 'MAPPING_FAILED' });
    } finally {
      await deleteTestOrganization(organization.id);
    }
  });
});
