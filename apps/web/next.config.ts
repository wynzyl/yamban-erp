import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// One .env at the monorepo root, shared with the API.
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // The browser only ever talks to this origin. /api/* is forwarded to NestJS,
  // so auth cookies are first-party and no CORS preflight is needed.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
  poweredByHeader: false,
};

export default nextConfig;
