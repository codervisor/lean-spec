import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Exclude SQLite database from file tracing to avoid ENOENT errors
  // The database is created at runtime or during seed
  outputFileTracingExcludes: {
    '*': ['**/*.db', '**/leanspec.db'],
  },
};

export default nextConfig;
