import { loadEnvConfig } from '@next/env';
import path from 'node:path';
import type { NextConfig } from 'next';

loadEnvConfig(
  path.resolve(process.cwd(), '../..'),
  process.env.NODE_ENV !== 'production',
  undefined,
  true,
);

const nextConfig: NextConfig = {
  transpilePackages: ['@wakeops/database', '@wakeops/integrations', '@wakeops/shared'],
  experimental: { cpus: 1 },
};

export default nextConfig;
