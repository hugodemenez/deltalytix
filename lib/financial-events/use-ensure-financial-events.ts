"use client"

import { useEffect } from "react"
import { useCurrentLocale } from "@/locales/client"
import { getFinancialEventsInWindow } from "@/server/financial-events"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import {
  financialEventRangeCovers,
  type FinancialEventDateWindow,
} from "@/lib/financial-events/date-window"
import {
  financialEventLoadKey,
  performFinancialEventLoad,
  shouldLoadFinancialEvents,
} from "@/lib/financial-events/ensure-load"

const inflight = new Set<string>()

/**
 * Load `window` into the financial-events store once the dashboard bootstrap
 * has recorded the range it already fetched. Shared views never initialize
 * the store, so they stay event-free, matching the previous payload.
 *
 * A failed fetch increments `loadErrors` and does not mark the range loaded,
 * so the effect runs again until the attempt cap. `retryFinancialEventLoad`
 * resets that cap.
 */
export function useEnsureFinancialEvents(
  window: FinancialEventDateWindow | null,
): void {
  const locale = useCurrentLocale()
  const initialized = useFinancialEventsStore((state) => state.initialized)
  const loadedRanges = useFinancialEventsStore((state) => state.loadedRanges)
  const mergeEvents = useFinancialEventsStore((state) => state.mergeEvents)
  const noteLoadFailure = useFinancialEventsStore((state) => state.noteLoadFailure)
  const clearLoadError = useFinancialEventsStore((state) => state.clearLoadError)
  const startMs = window?.start.getTime()
  const endMs = window?.end.getTime()
  const loadKey =
    startMs == null || endMs == null || !locale
      ? null
      : financialEventLoadKey(locale, startMs, endMs)
  const attempts = useFinancialEventsStore((state) =>
    loadKey ? (state.loadErrors[loadKey]?.attempts ?? 0) : 0,
  )

  useEffect(() => {
    if (!initialized || startMs == null || endMs == null || !locale || !loadKey) return
    const needed = { startMs, endMs, lang: locale }
    const decision = shouldLoadFinancialEvents({
      initialized,
      covered: financialEventRangeCovers(loadedRanges, needed),
      attempts,
    })
    if (decision !== "load") return
    if (inflight.has(loadKey)) return
    inflight.add(loadKey)
    const range = {
      start: new Date(startMs),
      end: new Date(endMs),
      lang: locale,
    }
    performFinancialEventLoad({
      fetchWindow: () =>
        getFinancialEventsInWindow(
          locale,
          range.start.toISOString(),
          range.end.toISOString(),
        ),
      merge: (events) => {
        mergeEvents(events, range)
        clearLoadError(loadKey)
      },
      fail: (message) => {
        noteLoadFailure(loadKey, range, message)
      },
    }).finally(() => {
      inflight.delete(loadKey)
    })
  }, [
    initialized,
    startMs,
    endMs,
    locale,
    loadKey,
    attempts,
    loadedRanges,
    mergeEvents,
    noteLoadFailure,
    clearLoadError,
  ])
}
