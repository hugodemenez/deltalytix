"use client"

import { useEffect } from "react"
import { getFinancialEventsInRange } from "@/server/financial-events"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import {
  windowCovers,
  type FinancialEventDateWindow,
} from "@/lib/financial-events/date-window"
import type { FinancialEvent } from "@/prisma/generated/prisma/browser"

const inFlight = new Map<string, Promise<FinancialEvent[]>>()

/**
 * Load `needed` once the dashboard has recorded the window it already fetched.
 * An empty loaded-window list means this view never called getUserData
 * (shared dashboards), so it stays without events.
 */
export function useEnsureFinancialEvents(
  needed: FinancialEventDateWindow,
  locale: string,
) {
  const loadedWindows = useFinancialEventsStore((state) => state.loadedWindows)
  const mergeEvents = useFinancialEventsStore((state) => state.mergeEvents)
  const fromMs = needed.from.getTime()
  const toMs = needed.to.getTime()

  useEffect(() => {
    if (loadedWindows.length === 0) return
    const window = { from: new Date(fromMs), to: new Date(toMs) }
    if (windowCovers(loadedWindows, window)) return

    const key = `${locale}|${fromMs}|${toMs}`
    let promise = inFlight.get(key)
    if (!promise) {
      promise = getFinancialEventsInRange(
        locale,
        window.from.toISOString(),
        window.to.toISOString(),
      ).finally(() => {
        inFlight.delete(key)
      })
      inFlight.set(key, promise)
    }

    let cancelled = false
    promise
      .then((events) => {
        if (!cancelled) mergeEvents(events, window)
      })
      .catch((error: unknown) => {
        console.error("Failed to load financial events for visible range", error)
      })

    return () => {
      cancelled = true
    }
  }, [fromMs, toMs, locale, loadedWindows, mergeEvents])
}
