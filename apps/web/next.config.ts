import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@wakeops/database', '@wakeops/shared'],
};

export default nextConfig;
