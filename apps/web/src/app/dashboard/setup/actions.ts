'use server';

import { database, Prisma } from '@wakeops/database';
import {
  engineerFormSchema,
  hostSchema,
  namedRecordSchema,
  serviceDeploymentSchema,
} from '@wakeops/shared';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/organization';

export type SetupState = { error?: string; success?: string };

const allowedOperations = ['create', 'update', 'delete'];

export async function saveSetup(_state: SetupState, form: FormData): Promise<SetupState> {
  const membership = await requireOrganization();
  if (membership.role !== 'ADMIN') return { error: 'Only organization admins can change setup.' };

  const organizationId = membership.organizationId;
  const input = Object.fromEntries(form);
  const kind = form.get('kind');
  const operation = String(form.get('operation') ?? 'create');
  const recordId = form.get('recordId');

  if (!allowedOperations.includes(operation)) return { error: 'Choose a supported operation.' };
  if (
    operation !== 'create' &&
    (typeof recordId !== 'string' || !recordId || recordId.length > 100)
  ) {
    return { error: 'Choose a saved record.' };
  }
  if (kind === 'deployment' && operation === 'update') {
    return { error: 'Remove this service deployment and add it again to change it.' };
  }

  const where = { id: typeof recordId === 'string' ? recordId : '', organizationId };

  try {
    if (operation === 'delete') {
      const result = await deleteRecord(String(kind), where);
      if (!result.count) return { error: 'This record no longer exists in your organization.' };
    } else if (kind === 'engineer') {
      const parsed = engineerFormSchema.safeParse(input);
      if (!parsed.success)
        return validationError(parsed.error.issues[0]?.message, 'Check the engineer details.');
      if (operation === 'update') {
        const result = await database.engineer.updateMany({ where, data: parsed.data });
        if (!result.count) return { error: 'This engineer no longer exists in your organization.' };
      } else {
        await database.engineer.create({ data: { ...parsed.data, organizationId } });
      }
    } else if (kind === 'application' || kind === 'environment') {
      const parsed = namedRecordSchema.safeParse(input);
      if (!parsed.success)
        return validationError(parsed.error.issues[0]?.message, 'Check the name.');
      const data = { name: parsed.data.name.toLowerCase(), organizationId };
      if (operation === 'update') {
        const result =
          kind === 'application'
            ? await database.application.updateMany({ where, data })
            : await database.environment.updateMany({ where, data });
        if (!result.count) return { error: 'This record no longer exists in your organization.' };
      } else if (kind === 'application') {
        await database.application.create({ data });
      } else {
        await database.environment.create({ data });
      }
    } else if (kind === 'host') {
      const parsed = hostSchema.safeParse(input);
      if (!parsed.success)
        return validationError(parsed.error.issues[0]?.message, 'Check the host details.');
      const value = parsed.data;
      const data = {
        organizationId,
        name: value.name,
        source: 'GRAFANA' as const,
        externalIdentifier: value.externalIdentifier,
      };
      if (operation === 'update') {
        const result = await database.monitoredResource.updateMany({ where, data });
        if (!result.count) return { error: 'This host no longer exists in your organization.' };
      } else {
        await database.monitoredResource.create({ data });
      }
    } else if (kind === 'deployment') {
      const parsed = serviceDeploymentSchema.safeParse(input);
      if (!parsed.success)
        return validationError(parsed.error.issues[0]?.message, 'Check the service deployment.');
      await createDeployment(organizationId, parsed.data);
    } else {
      return { error: 'Choose a supported setup action.' };
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_MAPPING') {
      return { error: 'Choose a host, service, environment and engineers from your organization.' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'This record already exists in your organization.' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return {
        error: 'This record is still in use. Remove its service deployment or host link first.',
      };
    }
    return { error: 'Could not save your changes. Check the database connection and try again.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/setup');
  return { success: operation === 'delete' ? 'Deleted successfully.' : 'Saved successfully.' };
}

function validationError(message: string | undefined, fallback: string): SetupState {
  return { error: message ?? fallback };
}

async function deleteRecord(kind: string, where: { id: string; organizationId: string }) {
  if (kind === 'engineer') return database.engineer.deleteMany({ where });
  if (kind === 'application') return database.application.deleteMany({ where });
  if (kind === 'environment') return database.environment.deleteMany({ where });
  if (kind === 'host') return database.monitoredResource.deleteMany({ where });
  if (kind === 'deployment') return database.resourceMapping.deleteMany({ where });
  throw new Error('UNSUPPORTED_RECORD');
}

async function createDeployment(
  organizationId: string,
  value: {
    resourceId: string;
    applicationId: string;
    environmentId: string;
    primaryEngineerId: string;
    secondaryEngineerId: string;
  },
) {
  await database.$transaction(async (tx) => {
    const [resource, application, environment, primary, secondary] = await Promise.all([
      tx.monitoredResource.findFirst({ where: { id: value.resourceId, organizationId } }),
      tx.application.findFirst({ where: { id: value.applicationId, organizationId } }),
      tx.environment.findFirst({ where: { id: value.environmentId, organizationId } }),
      tx.engineer.findFirst({ where: { id: value.primaryEngineerId, organizationId } }),
      value.secondaryEngineerId
        ? tx.engineer.findFirst({ where: { id: value.secondaryEngineerId, organizationId } })
        : null,
    ]);
    if (
      !resource ||
      !application ||
      !environment ||
      !primary ||
      (value.secondaryEngineerId && !secondary)
    ) {
      throw new Error('INVALID_MAPPING');
    }
    const mapping = await tx.resourceMapping.create({
      data: {
        organizationId,
        resourceId: resource.id,
        applicationId: application.id,
        environmentId: environment.id,
      },
    });
    await tx.onCallAssignment.create({
      data: {
        organizationId,
        mappingId: mapping.id,
        primaryEngineerId: primary.id,
        secondaryEngineerId: secondary?.id ?? null,
      },
    });
  });
}
