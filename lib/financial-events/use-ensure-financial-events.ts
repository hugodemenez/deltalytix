"use client"

import { useEffect, useState } from "react"
import { getFinancialEventsInRange } from "@/server/financial-events"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import {
  windowCovers,
  type FinancialEventDateWindow,
} from "@/lib/financial-events/date-window"
import {
  FINANCIAL_EVENTS_MAX_ATTEMPTS,
  financialEventsEnsureStatus,
  financialEventsRetryDelayMs,
  type FinancialEventsEnsureStatus,
} from "@/lib/financial-events/ensure-status"
import type { FinancialEvent } from "@/prisma/generated/prisma/browser"

const inFlight = new Map<string, Promise<FinancialEvent[]>>()

type RangeFailure = { key: string; attempts: number }

/**
 * Load `needed` once the dashboard has recorded the window it already fetched.
 * An empty loaded-window list means this view never called getUserData
 * (shared dashboards), so it stays without events.
 *
 * A failed request retries while the same range stays on screen. The returned
 * status stays `loading` until a try succeeds, so callers do not treat a
 * missing range as an empty result.
 */
export function useEnsureFinancialEvents(
  needed: FinancialEventDateWindow,
  locale: string,
): { status: FinancialEventsEnsureStatus; retry: () => void } {
  const loadedWindows = useFinancialEventsStore((state) => state.loadedWindows)
  const mergeEvents = useFinancialEventsStore((state) => state.mergeEvents)
  const [failure, setFailure] = useState<RangeFailure | null>(null)
  const fromMs = needed.from.getTime()
  const toMs = needed.to.getTime()
  const key = `${locale}|${fromMs}|${toMs}`
  const [trackedKey, setTrackedKey] = useState(key)
  if (trackedKey !== key) {
    setTrackedKey(key)
    setFailure(null)
  }
  const attempts = failure?.key === key ? failure.attempts : 0
  const covered =
    loadedWindows.length > 0 &&
    windowCovers(loadedWindows, { from: new Date(fromMs), to: new Date(toMs) })

  useEffect(() => {
    if (loadedWindows.length === 0) return
    const window = { from: new Date(fromMs), to: new Date(toMs) }
    if (windowCovers(loadedWindows, window)) return
    if (attempts >= FINANCIAL_EVENTS_MAX_ATTEMPTS) return

    const flightKey = `${key}|${attempts}`
    let promise = inFlight.get(flightKey)
    if (!promise) {
      promise = getFinancialEventsInRange(
        locale,
        window.from.toISOString(),
        window.to.toISOString(),
      ).finally(() => {
        inFlight.delete(flightKey)
      })
      inFlight.set(flightKey, promise)
    }

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    promise
      .then((events) => {
        if (!cancelled) mergeEvents(events, window)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error("Failed to load financial events for visible range", error)
        const nextAttempt = attempts + 1
        if (nextAttempt >= FINANCIAL_EVENTS_MAX_ATTEMPTS) {
          setFailure({ key, attempts: nextAttempt })
          return
        }
        retryTimer = setTimeout(() => {
          if (!cancelled) setFailure({ key, attempts: nextAttempt })
        }, financialEventsRetryDelayMs(nextAttempt))
      })

    return () => {
      cancelled = true
      if (retryTimer !== undefined) clearTimeout(retryTimer)
    }
  }, [fromMs, toMs, locale, loadedWindows, mergeEvents, attempts, key])

  return {
    status: financialEventsEnsureStatus({
      seeded: loadedWindows.length > 0,
      covered,
      attempts,
    }),
    retry: () => setFailure(null),
  }
}
