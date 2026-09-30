import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';

const database = new PrismaClient();
afterAll(() => database.$disconnect());

describe('resource ownership database rules', () => {
  it('stores multiple service deployments on one host', async () => {
    const rollback = new Error('ROLLBACK_TEST');
    await expect(
      database.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: 'Test', slug: randomUUID() } });
        const engineer = await tx.engineer.create({
          data: {
            organizationId: org.id,
            name: 'Test Engineer',
            email: 'test@example.com',
            phoneNumber: '+919876543210',
          },
        });
        const payments = await tx.application.create({
          data: { organizationId: org.id, name: 'payments' },
        });
        const auth = await tx.application.create({
          data: { organizationId: org.id, name: 'auth' },
        });
        const environment = await tx.environment.create({
          data: { organizationId: org.id, name: 'production' },
        });
        const resource = await tx.monitoredResource.create({
          data: {
            organizationId: org.id,
            name: 'Host',
            source: 'CLOUDWATCH',
            externalIdentifier: 'i-test',
          },
        });
        const paymentsMapping = await tx.resourceMapping.create({
          data: {
            organizationId: org.id,
            resourceId: resource.id,
            applicationId: payments.id,
            environmentId: environment.id,
          },
        });
        const authMapping = await tx.resourceMapping.create({
          data: {
            organizationId: org.id,
            resourceId: resource.id,
            applicationId: auth.id,
            environmentId: environment.id,
          },
        });
        await tx.onCallAssignment.createMany({
          data: [paymentsMapping, authMapping].map((mapping) => ({
            organizationId: org.id,
            mappingId: mapping.id,
            primaryEngineerId: engineer.id,
          })),
        });
        const saved = await tx.monitoredResource.findUnique({
          where: { id: resource.id },
          include: { mappings: { include: { application: true, assignment: true } } },
        });
        expect(saved?.mappings).toHaveLength(2);
        expect(saved?.mappings.map((mapping) => mapping.application.name).sort()).toEqual([
          'auth',
          'payments',
        ]);
        expect(saved?.mappings.every((mapping) => Boolean(mapping.assignment))).toBe(true);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it('rejects the same service and environment twice on one host', async () => {
    await expect(
      database.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: 'Test', slug: randomUUID() } });
        const application = await tx.application.create({
          data: { organizationId: org.id, name: 'payments' },
        });
        const environment = await tx.environment.create({
          data: { organizationId: org.id, name: 'production' },
        });
        const resource = await tx.monitoredResource.create({
          data: {
            organizationId: org.id,
            name: 'Host',
            source: 'CLOUDWATCH',
            externalIdentifier: 'i-test',
          },
        });
        const data = {
          organizationId: org.id,
          resourceId: resource.id,
          applicationId: application.id,
          environmentId: environment.id,
        };
        await tx.resourceMapping.create({ data });
        await tx.resourceMapping.create({ data });
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a service owned by another organization', async () => {
    await expect(
      database.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: 'Test', slug: randomUUID() } });
        const other = await tx.organization.create({ data: { name: 'Other', slug: randomUUID() } });
        const application = await tx.application.create({
          data: { organizationId: other.id, name: 'other-service' },
        });
        const environment = await tx.environment.create({
          data: { organizationId: org.id, name: 'production' },
        });
        const resource = await tx.monitoredResource.create({
          data: {
            organizationId: org.id,
            name: 'Host',
            source: 'CLOUDWATCH',
            externalIdentifier: 'i-test',
          },
        });
        await tx.resourceMapping.create({
          data: {
            organizationId: org.id,
            resourceId: resource.id,
            applicationId: application.id,
            environmentId: environment.id,
          },
        });
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects duplicate resource identity within an organization and source', async () => {
    await expect(
      database.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: 'Test', slug: randomUUID() } });
        const data = {
          organizationId: org.id,
          name: 'Host',
          source: 'GRAFANA' as const,
          externalIdentifier: 'instance-1',
        };
        await tx.monitoredResource.create({ data });
        await tx.monitoredResource.create({ data });
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
