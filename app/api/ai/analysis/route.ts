import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Rate limit: 10 heavy analysis requests per user per minute
const AI_ANALYSIS_RATE_LIMIT = { limit: 10, windowMs: 60_000, prefix: 'ai:analysis' }

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, AI_ANALYSIS_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl)

  // Original handler logic follows — this file wraps the existing route
  // with rate limiting. The original implementation is preserved below.
  const { default: handler } = await import('./handler')
  return handler(req)
}
