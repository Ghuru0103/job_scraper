import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mongoose', 'ioredis', 'winston', 'prom-client'],
  turbopack: {},
};

export default nextConfig;
