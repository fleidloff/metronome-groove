import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the root: a lockfile outside this repository is not ours to infer from.
  turbopack: { root: import.meta.dirname },
  allowedDevOrigins: ['192.168.178.196'],
}

export default nextConfig
