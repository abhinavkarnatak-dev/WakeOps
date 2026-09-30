import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/organization', () => ({ requireOrganization: mocks.membership }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
vi.mock('@wakeops/database', async () => ({
  Prisma: (await import('@prisma/client')).Prisma,
  database: { engineer: { updateMany: mocks.update, deleteMany: mocks.remove } },
}));

import { saveSetup } from '../src/app/dashboard/setup/actions';

function form(operation: string) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    kind: 'engineer',
    operation,
    recordId: 'engineer-1',
    name: 'Engineer',
    email: 'a@example.com',
    phoneCountry: 'IN',
    nationalNumber: '9876543210',
  }))
    data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.membership.mockResolvedValue({ role: 'ADMIN', organizationId: 'org-1' });
});

describe('setup mutation permissions', () => {
  it('blocks a non-admin update', async () => {
    mocks.membership.mockResolvedValue({ role: 'MEMBER', organizationId: 'org-1' });
    expect((await saveSetup({}, form('update'))).error).toContain('Only organization admins');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('scopes edits to the signed-in organization and normalizes phones', async () => {
    mocks.update.mockResolvedValue({ count: 1 });
    await saveSetup({}, form('update'));
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'engineer-1', organizationId: 'org-1' },
      data: {
        name: 'Engineer',
        email: 'a@example.com',
        phoneCountry: 'IN',
        phoneNumber: '+919876543210',
      },
    });
  });
  it('does not report a foreign or missing record as deleted', async () => {
    mocks.remove.mockResolvedValue({ count: 0 });
    expect((await saveSetup({}, form('delete'))).error).toContain('no longer exists');
    expect(mocks.remove).toHaveBeenCalledWith({
      where: { id: 'engineer-1', organizationId: 'org-1' },
    });
  });
  it('explains why a linked engineer cannot be deleted', async () => {
    mocks.remove.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Constraint failed', {
        code: 'P2003',
        clientVersion: '6.12.0',
      }),
    );
    expect((await saveSetup({}, form('delete'))).error).toContain(
      'service deployment or host link',
    );
  });
});
