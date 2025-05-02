/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'fhvmtnvjiotzztimdxbi.supabase.co',
      },
    ],
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    // Remark and rehype plugins need to be imported dynamically
    // since they're ESM only
    remarkPlugins: [],  // We'll configure these in mdx.ts instead
    rehypePlugins: [],  // We'll configure these in mdx.ts instead
  },
})

module.exports = withMDX(nextConfig) 