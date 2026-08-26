/**
 * Per-key throttle + in-flight de-duplication for expensive Rithmic fetches.
 *
 * A PnL-plant balance fetch opens a WebSocket to the gateway and performs a
 * full `RequestLogin`, so an accounts widget that mounts on every dashboard
 * load must not translate one-to-one into gateway sessions. Entries live in
 * module scope: on serverless that is per-instance and best-effort, which is
 * enough to collapse the mount/refresh storm from a single browsing session.
 */

export interface ThrottledFetchOptions<T> {
  /** Throttle bucket — the user id, so users never share cached balances. */
  key: string
  fetch: () => Promise<T>
  /** Automatic fetches reuse a cached value younger than this. */
  ttlMs: number
  /** Floor between real fetches, even for user-initiated refreshes. */
  minRefreshMs: number
  /** User-initiated refresh: ignores `ttlMs` but still respects `minRefreshMs`. */
  force?: boolean
  /** Failures are returned to the caller but not cached when this returns false. */
  shouldCache?: (value: T) => boolean
  now?: () => number
}

export interface ThrottledFetchResult<T> {
  value: T
  /** True when `value` came from the cache rather than a fresh fetch. */
  fromCache: boolean
  /** Epoch ms the value was actually fetched from Rithmic. */
  fetchedAt: number
}

interface CacheEntry {
  value: unknown
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<ThrottledFetchResult<unknown>>>()

export async function withThrottledFetch<T>(
  options: ThrottledFetchOptions<T>,
): Promise<ThrottledFetchResult<T>> {
  const { key, fetch, ttlMs, minRefreshMs, force = false } = options
  const now = options.now ?? Date.now
  const shouldCache = options.shouldCache ?? (() => true)

  const cached = cache.get(key)
  if (cached) {
    const age = now() - cached.fetchedAt
    // A forced refresh still has to wait out `minRefreshMs`: clicking refresh
    // must never be a way to reopen the socket on every click.
    const maxAge = force ? minRefreshMs : ttlMs
    if (age < maxAge) {
      return {
        value: cached.value as T,
        fromCache: true,
        fetchedAt: cached.fetchedAt,
      }
    }
  }

  const pending = inFlight.get(key)
  if (pending) {
    // Concurrent mounts share the one session already talking to the gateway.
    return pending as Promise<ThrottledFetchResult<T>>
  }

  const run = (async (): Promise<ThrottledFetchResult<T>> => {
    const value = await fetch()
    const fetchedAt = now()
    if (shouldCache(value)) {
      cache.set(key, { value, fetchedAt })
    } else {
      cache.delete(key)
    }
    return { value, fromCache: false, fetchedAt }
  })()

  inFlight.set(key, run as Promise<ThrottledFetchResult<unknown>>)
  try {
    return await run
  } finally {
    if (inFlight.get(key) === (run as Promise<ThrottledFetchResult<unknown>>)) {
      inFlight.delete(key)
    }
  }
}

/** Drop a cached value, e.g. after credentials change. */
export function invalidateThrottledFetch(key: string): void {
  cache.delete(key)
}

/** Test seam — clears every bucket. */
export function resetThrottledFetchCache(): void {
  cache.clear()
  inFlight.clear()
}
