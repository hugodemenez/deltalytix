import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, rateLimitResponse } from '../rate-limit'

// Helper to create a mock Request with optional IP headers
function makeRequest(ip?: string): Request {
  const headers: Record<string, string> = {}
  if (ip) headers['x-forwarded-for'] = ip
  return new Request('https://deltalytix.app/api/ai/chat', {
    method: 'POST',
    headers,
  })
}

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset the module to clear the in-memory store between tests
    vi.resetModules()
  })

  it('allows requests within the limit', () => {
    const req = makeRequest('1.2.3.4')
    const result = rateLimit(req, { limit: 5, windowMs: 60_000, prefix: 'test1' })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.limit).toBe(5)
  })

  it('tracks multiple requests from same IP', () => {
    const ip = '10.0.0.1'
    const opts = { limit: 3, windowMs: 60_000, prefix: 'test2' }
    const r1 = rateLimit(makeRequest(ip), opts)
    const r2 = rateLimit(makeRequest(ip), opts)
    const r3 = rateLimit(makeRequest(ip), opts)
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests exceeding the limit', () => {
    const ip = '10.0.0.2'
    const opts = { limit: 2, windowMs: 60_000, prefix: 'test3' }
    rateLimit(makeRequest(ip), opts)
    rateLimit(makeRequest(ip), opts)
    const blocked = rateLimit(makeRequest(ip), opts)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('isolates different prefixes for same IP', () => {
    const ip = '10.0.0.3'
    const optsA = { limit: 1, windowMs: 60_000, prefix: 'chat' }
    const optsB = { limit: 1, windowMs: 60_000, prefix: 'analysis' }
    const a1 = rateLimit(makeRequest(ip), optsA)
    const b1 = rateLimit(makeRequest(ip), optsB)
    // Both should succeed because they have different prefixes
    expect(a1.success).toBe(true)
    expect(b1.success).toBe(true)
  })

  it('isolates different IPs', () => {
    const opts = { limit: 1, windowMs: 60_000, prefix: 'test4' }
    const r1 = rateLimit(makeRequest('192.168.1.1'), opts)
    const r2 = rateLimit(makeRequest('192.168.1.2'), opts)
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
  })
})

describe('rateLimitResponse', () => {
  it('returns 429 status', () => {
    const result = { success: false, limit: 10, remaining: 0, reset: Date.now() + 30_000 }
    const res = rateLimitResponse(result)
    expect(res.status).toBe(429)
  })

  it('sets correct rate limit headers', async () => {
    const reset = Date.now() + 30_000
    const result = { success: false, limit: 10, remaining: 0, reset }
    const res = rateLimitResponse(result)
    expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(res.headers.get('X-RateLimit-Reset')).toBe(String(reset))
  })

  it('returns JSON body with error message', async () => {
    const result = { success: false, limit: 10, remaining: 0, reset: Date.now() + 10_000 }
    const res = rateLimitResponse(result)
    const body = await res.json()
    expect(body.error).toMatch(/too many requests/i)
    expect(body.reset).toBeDefined()
  })
})
