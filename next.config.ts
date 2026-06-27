import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import { SUPPORT_SEARCH_TRACE_INCLUDES } from './lib/ai/search-codebase';

const nextConfig: NextConfig = {
  output: "standalone",
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
  experimental: {
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
    '/*': [
      '**/node_modules/@prisma/engines/libquery_engine-rhel-openssl-3.0.x.so.node',
      '**/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    ],
    '/app/api/**': [  // For App Router API routes (your auth callback)
      '**/node_modules/.prisma/client/**',
    ],
    // Runtime fs search in /api/ai/support — keep docs in the serverless bundle.
    '/app/api/ai/support/route': [...SUPPORT_SEARCH_TRACE_INCLUDES],
  },
}

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);