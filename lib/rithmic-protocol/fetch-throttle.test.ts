import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  invalidateThrottledFetch,
  resetThrottledFetchCache,
  withThrottledFetch,
} from './fetch-throttle'

describe('withThrottledFetch', () => {
  beforeEach(() => {
    resetThrottledFetchCache()
  })

  function harness(now: () => number) {
    const fetch = vi.fn(async () => ({ success: true, value: fetch.mock.calls.length }))
    const call = (options: { force?: boolean } = {}) =>
      withThrottledFetch({
        key: 'user-1',
        fetch,
        ttlMs: 60_000,
        minRefreshMs: 15_000,
        shouldCache: (result) => result.success,
        now,
        ...options,
      })
    return { fetch, call }
  }

  it('serves repeated mounts from cache within the TTL', async () => {
    let clock = 1_000
    const { fetch, call } = harness(() => clock)

    const first = await call()
    clock += 30_000
    const second = await call()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(first.fromCache).toBe(false)
    expect(second.fromCache).toBe(true)
    expect(second.fetchedAt).toBe(1_000)
  })

  it('fetches again once the TTL has elapsed', async () => {
    let clock = 1_000
    const { fetch, call } = harness(() => clock)

    await call()
    clock += 60_001
    const refreshed = await call()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(refreshed.fromCache).toBe(false)
  })

  it('lets a forced refresh bypass the TTL', async () => {
    let clock = 1_000
    const { fetch, call } = harness(() => clock)

    await call()
    clock += 20_000
    const forced = await call({ force: true })

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(forced.fromCache).toBe(false)
  })

  it('holds a forced refresh to the minimum interval', async () => {
    let clock = 1_000
    const { fetch, call } = harness(() => clock)

    await call()
    clock += 14_999
    const forced = await call({ force: true })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(forced.fromCache).toBe(true)
  })

  it('collapses concurrent callers onto one fetch', async () => {
    const clock = () => 1_000
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const fetch = vi.fn(async () => {
      await gate
      return { success: true }
    })

    const call = () =>
      withThrottledFetch({
        key: 'user-1',
        fetch,
        ttlMs: 60_000,
        minRefreshMs: 15_000,
        now: clock,
      })

    const results = Promise.all([call(), call(), call()])
    release?.()
    await results

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not cache results rejected by shouldCache', async () => {
    const clock = () => 1_000
    const fetch = vi.fn(async () => ({ success: false }))

    const call = () =>
      withThrottledFetch({
        key: 'user-1',
        fetch,
        ttlMs: 60_000,
        minRefreshMs: 15_000,
        shouldCache: (result) => result.success,
        now: clock,
      })

    await call()
    await call()

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('clears the in-flight entry when the fetch throws', async () => {
    const clock = () => 1_000
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('gateway down'))
      .mockResolvedValueOnce({ success: true })

    const call = () =>
      withThrottledFetch({
        key: 'user-1',
        fetch,
        ttlMs: 60_000,
        minRefreshMs: 15_000,
        now: clock,
      })

    await expect(call()).rejects.toThrow('gateway down')
    await expect(call()).resolves.toMatchObject({ fromCache: false })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('keeps buckets separate per key and honours invalidation', async () => {
    const clock = () => 1_000
    const fetch = vi.fn(async () => ({ success: true }))
    const call = (key: string) =>
      withThrottledFetch({ key, fetch, ttlMs: 60_000, minRefreshMs: 15_000, now: clock })

    await call('user-1')
    await call('user-2')
    expect(fetch).toHaveBeenCalledTimes(2)

    await call('user-1')
    expect(fetch).toHaveBeenCalledTimes(2)

    invalidateThrottledFetch('user-1')
    await call('user-1')
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
