"use client"

import { useEffect } from "react"
import { useCurrentLocale } from "@/locales/client"
import { getFinancialEventsInWindow } from "@/server/financial-events"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import {
  financialEventRangeCovers,
  type FinancialEventDateWindow,
} from "@/lib/financial-events/date-window"

const inflight = new Set<string>()

/**
 * Load `window` into the financial-events store once the dashboard bootstrap
 * has recorded the range it already fetched. Shared views never initialize
 * the store, so they stay event-free, matching the previous payload.
 */
export function useEnsureFinancialEvents(
  window: FinancialEventDateWindow | null,
): void {
  const locale = useCurrentLocale()
  const initialized = useFinancialEventsStore((state) => state.initialized)
  const loadedRanges = useFinancialEventsStore((state) => state.loadedRanges)
  const mergeEvents = useFinancialEventsStore((state) => state.mergeEvents)
  const startMs = window?.start.getTime()
  const endMs = window?.end.getTime()

  useEffect(() => {
    if (!initialized || startMs == null || endMs == null || !locale) return
    const needed = { startMs, endMs, lang: locale }
    if (financialEventRangeCovers(loadedRanges, needed)) return
    const key = `${locale}:${startMs}:${endMs}`
    if (inflight.has(key)) return
    inflight.add(key)
    getFinancialEventsInWindow(
      locale,
      new Date(startMs).toISOString(),
      new Date(endMs).toISOString(),
    )
      .then((events) => {
        mergeEvents(events, {
          start: new Date(startMs),
          end: new Date(endMs),
          lang: locale,
        })
      })
      .catch((error: unknown) => {
        console.error("[financial-events] failed to load date window", error)
      })
      .finally(() => {
        inflight.delete(key)
      })
  }, [initialized, startMs, endMs, locale, loadedRanges, mergeEvents])
}
