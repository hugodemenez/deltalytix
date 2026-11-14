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
  financialEventRetryDelayMs,
  performFinancialEventLoad,
  shouldLoadFinancialEvents,
} from "@/lib/financial-events/ensure-load"

const inflight = new Map<string, object>()

export function resetFinancialEventLoadInflightForTests(): void {
  inflight.clear()
}

/**
 * Load `window` into the financial-events store once the dashboard bootstrap
 * has recorded the range it already fetched. Shared views never initialize
 * the store, so they stay event-free, matching the previous payload.
 *
 * A failed fetch increments `loadErrors` and does not mark the range loaded.
 * The in-flight key is dropped before that store update: the effect re-runs
 * from the attempt count, and leaving the key set made the retry return
 * immediately. Later attempts wait on `financialEventRetryDelayMs`.
 * `retryFinancialEventLoad` resets the cap after it is exhausted.
 *
 * A started fetch always merges or records the failure. Cleanup only cancels
 * a timer that has not fired. Dropping a completed response when
 * `loadedRanges` changes (refresh, another widget, paging) left the month
 * empty with no retry.
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

    const token = {}
    inflight.set(loadKey, token)
    let started = false
    const range = {
      start: new Date(startMs),
      end: new Date(endMs),
      lang: locale,
    }
    const release = () => {
      if (inflight.get(loadKey) === token) inflight.delete(loadKey)
    }
    const timer = setTimeout(() => {
      started = true
      void performFinancialEventLoad({
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
          release()
          noteLoadFailure(loadKey, range, message)
        },
      }).finally(release)
    }, financialEventRetryDelayMs(attempts))

    return () => {
      clearTimeout(timer)
      if (!started) release()
    }
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
