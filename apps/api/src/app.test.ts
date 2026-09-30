import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('health endpoint', () => {
  const server = createApp().listen(0);

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      if (server.listening) resolve();
      else server.once('listening', resolve);
    });
  });

  afterAll(() => server.close());

  it('reports that the process is alive without checking external providers', async () => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no TCP port.');

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', service: 'wakeops-api' });
  });
});
