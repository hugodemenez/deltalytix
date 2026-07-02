import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import os from 'os';
import path from 'path';
import { SUPPORT_SEARCH_TRACE_INCLUDES } from './lib/ai/search-codebase';

const detectedBuildWorkers =
  typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
const defaultBuildWorkers = Math.max(4, detectedBuildWorkers * 2);
const configuredBuildWorkers = Number.parseInt(
  process.env.NEXT_BUILD_WORKERS ?? '',
  10
);
const buildWorkers =
  Number.isFinite(configuredBuildWorkers) && configuredBuildWorkers > 0
    ? configuredBuildWorkers
    : defaultBuildWorkers;

const fontConfigDir = path.join(process.cwd(), 'config/fontconfig');
process.env.FONTCONFIG_PATH ??= fontConfigDir;
process.env.FONTCONFIG_FILE ??= path.join(fontConfigDir, 'fonts.conf');

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["13.36.171.174"],
  // NOTE: Do not add hardcoded /en redirects for localized routes (e.g. /updates
  // -> /en/updates). next.config redirects run before middleware, so they force a
  // single locale and prevent the i18n middleware from routing by the user's
  // selected language. Locale routing is handled entirely by the i18n middleware.
  // cacheComponents: true, // Enable Cache Components (Next.js 16+)
  images: {
    remotePatterns: [
      {
        hostname: 'fhvmtnvjiotzztimdxbi.supabase.co',
      },
    ],
  },
  pageExtensions: ['mdx', 'ts', 'tsx'],
  typescript: {
    // Keep full checking in `bun run typecheck`; do not duplicate it inside `next build`.
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: buildWorkers,
    webpackBuildWorker: true,
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
    useCache: true,
    mdxRs: true,
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'framer-motion',
      'motion',
    ],
  },
  outputFileTracingIncludes: {
    '/app/api/**': [
      './prisma/generated/prisma/**',
    ],
    // Runtime fs search in /api/ai/support — keep docs in the serverless bundle.
    '/api/ai/support': [...SUPPORT_SEARCH_TRACE_INCLUDES],
  },
}

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
