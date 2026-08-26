import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import os from 'os';
import { SUPPORT_SEARCH_TRACE_INCLUDES } from './lib/ai/search-codebase';
import { AGENT_SKILLS_TRACE_INCLUDES } from './lib/agent-skills/load-skill';
import { LOCALES } from './lib/locales';

const detectedBuildWorkers =
  typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
// On Vercel (4-core build machines), oversubscribing workers (* 2) causes
// static-generation thrashing and 60s per-page timeouts. Match core count.
const defaultBuildWorkers = process.env.VERCEL
  ? Math.max(1, detectedBuildWorkers)
  : Math.max(4, detectedBuildWorkers * 2);
const configuredBuildWorkers = Number.parseInt(
  process.env.NEXT_BUILD_WORKERS ?? '',
  10
);
const buildWorkers =
  Number.isFinite(configuredBuildWorkers) && configuredBuildWorkers > 0
    ? configuredBuildWorkers
    : defaultBuildWorkers;

/** Proto + SSL assets loaded via fs at runtime (server actions + API routes). */
const RITHMIC_PROTOCOL_TRACE_INCLUDES = [
  './lib/rithmic-protocol/proto/**/*',
  './lib/rithmic-protocol/etc/**/*',
] as const;

const nextConfig: NextConfig = {
  // Standalone is for Docker/self-host (`Dockerfile.bun` copies `.next/standalone`).
  // On Vercel + Turbopack (Next 16.3+), the adapter skips `next-server.js.nft.json`,
  // so `output: "standalone"` crashes finalize with ENOENT. Vercel ignores standalone
  // output anyway.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  // Hide the Next.js dev indicator during changelog media capture (see agents/skills/changelog-media/SKILL.md).
  ...(process.env.CHANGELOG_MEDIA_CAPTURE === '1' ? { devIndicators: false as const } : {}),
  allowedDevOrigins: [
    "13.36.171.174",
    "192.168.0.178",
    "localhost",
    "127.0.0.1",
  ],
  // NOTE: Do not add hardcoded /en redirects for localized routes (e.g. /updates
  // -> /en/updates). next.config redirects run before middleware, so they force a
  // single locale and prevent the i18n middleware from routing by the user's
  // selected language. Locale routing is handled entirely by the i18n middleware.
  // Instant Navigations: Cache Components + Partial Prefetching (Next.js 16.3+).
  // Opt routes in with `export const instant = true` (and optionally
  // `export const prefetch = 'allow-runtime'` for session-aware prefetch).
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        hostname: 'fhvmtnvjiotzztimdxbi.supabase.co',
      },
    ],
  },
  async headers() {
    // The homepage answers with HTML or with text/markdown depending on Accept.
    // `Vary` has to say so or a CDN can hand a cached HTML response to an agent
    // that asked for markdown, and vice versa. It is set here rather than in
    // the proxy because Next.js replaces the `Vary` it sets on App Router pages
    // with its own RSC value; headers from the config are appended afterwards.
    return [
      {
        source: "/",
        headers: [{ key: "Vary", value: "Accept" }],
      },
      {
        source: `/:locale(${LOCALES.join("|")})`,
        headers: [{ key: "Vary", value: "Accept" }],
      },
    ];
  },
  // Locale-scoped so i18n middleware still owns unprefixed /trading-journal.
  // Do not 308 the hub itself to /en.
  async redirects() {
    return [
      {
        source: '/:locale(en|fr)/trading-journal',
        destination: '/:locale/trading-journal/futures',
        permanent: true,
      },
    ];
  },
  pageExtensions: ['mdx', 'ts', 'tsx'],
  // `read-excel-file/node` pulls in `unzipper`, whose optional S3 support
  // requires '@aws-sdk/client-s3' at runtime; keep it external so Turbopack
  // does not try to resolve that optional dependency at build time.
  serverExternalPackages: ['read-excel-file', 'unzipper'],
  typescript: {
    // Keep full checking in `bun run typecheck`; do not duplicate it inside `next build`.
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: buildWorkers,
    mdxRs: true,
    // Unmatched URLs must answer with a real 404 status. The app's root layout
    // sits under the dynamic `[locale]` segment, so there is no single layout a
    // route-level not-found could compose from; `app/global-not-found.tsx` is
    // resolved by the router instead, before any shell is flushed.
    globalNotFound: true,
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
    // Runtime fs search in /api/ai/support — keep docs in the serverless bundle.
    '/api/ai/support': [...SUPPORT_SEARCH_TRACE_INCLUDES],
    // /.well-known/agent-skills/index.json is dynamic and reads the shared
    // skill markdown at request time to compute its digests.
    '/.well-known/agent-skills/**': [...AGENT_SKILLS_TRACE_INCLUDES],
    // Protocol login is a server action from Connections (not only /api/rithmic-protocol/*).
    // Include assets for all server traces so preview/production lambdas can load protos.
    '/*': [...RITHMIC_PROTOCOL_TRACE_INCLUDES],
    '/api/rithmic-protocol/**': [...RITHMIC_PROTOCOL_TRACE_INCLUDES],
  },
}

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
