import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@wakeops/database', '@wakeops/integrations', '@wakeops/shared'],
  experimental: { cpus: 1 },
};

export default nextConfig;
