import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Exclude SQLite database from file tracing to avoid ENOENT errors
  // The database is created at runtime or during seed
  outputFileTracingExcludes: {
    '*': ['**/*.db', '**/leanspec.db'],
  },
  async redirects() {
    return [
      {
        source: '/specs/:path*',
        destination: '/projects/default/specs/:path*',
        permanent: true,
      },
      {
        source: '/dependencies',
        destination: '/projects/default/dependencies',
        permanent: true,
      },
      {
        source: '/stats',
        destination: '/projects/default/stats',
        permanent: true,
      },
      {
        source: '/context',
        destination: '/projects/default/context',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
