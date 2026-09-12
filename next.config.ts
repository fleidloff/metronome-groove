import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the root: a lockfile outside this repository is not ours to infer from.
  turbopack: { root: import.meta.dirname },
}

export default nextConfig
