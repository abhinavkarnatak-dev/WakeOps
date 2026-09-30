import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  removeTests: vi.fn(),
  upsert: vi.fn(),
  disconnect: vi.fn(),
  transaction: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/lib/organization', () => ({ requireOrganization: mocks.membership }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
vi.mock('@wakeops/database', () => ({
  database: {
    monitoringWebhookTest: { deleteMany: mocks.removeTests },
    grafanaIntegration: { upsert: mocks.upsert, deleteMany: mocks.disconnect },
    $transaction: mocks.transaction,
  },
}));

import { manageGrafanaConnection } from '../src/app/dashboard/integrations/actions';

function form(operation: string) {
  const data = new FormData();
  data.set('operation', operation);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.membership.mockResolvedValue({ role: 'ADMIN', organizationId: 'org-1' });
  mocks.removeTests.mockReturnValue(Promise.resolve({ count: 0 }));
  mocks.upsert.mockReturnValue(Promise.resolve({ id: 'integration-1' }));
  mocks.disconnect.mockReturnValue(Promise.resolve({ count: 1 }));
  mocks.transaction.mockResolvedValue([]);
});

describe('Grafana connection actions', () => {
  it('generates a secret but stores only its hash', async () => {
    const result = await manageGrafanaConnection({}, form('generate'));
    expect(result.secret).toMatch(/^wakeops_grafana_/);
    const input = mocks.upsert.mock.calls[0]?.[0];
    expect(input.where).toEqual({ organizationId: 'org-1' });
    expect(input.create.secretHash).toMatch(/^[a-f0-9]{64}$/);
    expect(input.create.secretHash).not.toBe(result.secret);
  });

  it('blocks non-admin changes', async () => {
    mocks.membership.mockResolvedValue({ role: 'MEMBER', organizationId: 'org-1' });
    const result = await manageGrafanaConnection({}, form('rotate'));
    expect(result.error).toContain('Only organization admins');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('removes the integration and old test receipt', async () => {
    const result = await manageGrafanaConnection({}, form('disconnect'));
    expect(result.success).toContain('disconnected');
    expect(mocks.disconnect).toHaveBeenCalledWith({ where: { organizationId: 'org-1' } });
    expect(mocks.removeTests).toHaveBeenCalled();
  });
});
