import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import os from 'os';
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

const nextConfig: NextConfig = {
  output: "standalone",
  // Hide the Next.js dev indicator during changelog media capture (see lib/agent-skills/changelog-media.md).
  ...(process.env.CHANGELOG_MEDIA_CAPTURE === '1' ? { devIndicators: false as const } : {}),
  // playwright-core reads browsers.json at import time; keep it external + traced for cron scraping.
  serverExternalPackages: ['playwright-core', '@vercel/sandbox'],
  allowedDevOrigins: ["13.36.171.174", "192.168.0.178"],
  // NOTE: Do not add hardcoded /en redirects for localized routes (e.g. /updates
  // -> /en/updates). next.config redirects run before middleware, so they force a
  // single locale and prevent the i18n middleware from routing by the user's
  // selected language. Locale routing is handled entirely by the i18n middleware.
  // Instant Navigations: Cache Components + Partial Prefetching (Next.js 16.3+).
  cacheComponents: true,
  partialPrefetching: true,
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
    mdxRs: true,
    // Quiet Route Handler prerender bail-outs that are caught by try/catch.
    hideLogsAfterAbort: true,
    // Validate Instant Navigations only on routes that export `instant`.
    instantInsights: {
      validationLevel: 'manual-warning',
    },
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
    '/api/cron/investing': [
      './node_modules/playwright-core/**',
    ],
    // Runtime fs search in /api/ai/support — keep docs in the serverless bundle.
    '/api/ai/support': [...SUPPORT_SEARCH_TRACE_INCLUDES],
  },
}

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
