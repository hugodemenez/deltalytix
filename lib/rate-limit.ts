/**
 * In-memory rate limiter for Next.js API routes.
 * No external dependencies — uses a sliding window algorithm.
 *
 * Usage:
 *   const result = await rateLimit(req, { limit: 10, windowMs: 60_000 })
 *   if (!result.success) return rateLimitResponse(result)
 */

type RateLimitEntry = {
  count: number
  resetAt: number
}

// Global in-memory store — persists across requests in same Node.js process.
// For multi-instance deployments (e.g. Vercel with multiple serverless functions),
// consider replacing with Upstash Redis for distributed rate limiting.
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export type RateLimitOptions = {
  /** Max requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
  /** Optional key prefix to isolate different rate limiters */
  prefix?: string
}

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp ms when the window resets
}

/**
 * Extract client identifier from request.
 * Uses x-forwarded-for (Vercel/proxies) then falls back to a default.
 */
function getClientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can be comma-separated list; take first IP
    return forwarded.split(',')[0].trim()
  }
  // Vercel Edge — real IP header
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'anonymous'
}

/**
 * Check and update rate limit for a request.
 * Sliding window: each new request extends the window if within limit.
 */
export function rateLimit(
  req: Request,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs, prefix = 'rl' } = options
  const clientKey = getClientKey(req)
  const key = `${prefix}:${clientKey}`
  const now = Date.now()

  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs }
  }

  if (existing.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: existing.resetAt,
    }
  }

  existing.count += 1
  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    reset: existing.resetAt,
  }
}

/**
 * Returns a standard 429 Too Many Requests response.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      reset: new Date(result.reset).toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
      },
    }
  )
}
