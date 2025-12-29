'use client'

import { useMemo } from "react"
import { format } from "date-fns"

import DesktopCalendarPnl from "@/app/[locale]/dashboard/components/calendar/desktop-calendar"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"

function buildDemoCalendarData(): CalendarData {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const entries = [
    { day: 1, pnl: 120, trades: 1, longs: 1, shorts: 0 },
    { day: 2, pnl: 620, trades: 4, longs: 2, shorts: 2 },
    { day: 3, pnl: 80, trades: 2, longs: 1, shorts: 1 },
    { day: 4, pnl: -240, trades: 3, longs: 1, shorts: 2 },
    { day: 6, pnl: 380, trades: 2, longs: 2, shorts: 0 },
    { day: 7, pnl: -60, trades: 1, longs: 0, shorts: 1 },
    { day: 9, pnl: 980, trades: 5, longs: 3, shorts: 2 },
    { day: 11, pnl: 210, trades: 2, longs: 1, shorts: 1 },
    { day: 12, pnl: -120, trades: 2, longs: 1, shorts: 1 },
    { day: 14, pnl: 320, trades: 1, longs: 1, shorts: 0 },
    { day: 15, pnl: 540, trades: 3, longs: 2, shorts: 1 },
    { day: 18, pnl: -320, trades: 4, longs: 1, shorts: 3 },
    { day: 19, pnl: 90, trades: 1, longs: 0, shorts: 1 },
    { day: 21, pnl: 760, trades: 3, longs: 2, shorts: 1 },
    { day: 22, pnl: -45, trades: 1, longs: 0, shorts: 1 },
    { day: 24, pnl: 150, trades: 2, longs: 1, shorts: 1 },
    { day: 25, pnl: 70, trades: 1, longs: 1, shorts: 0 },
    { day: 27, pnl: 420, trades: 3, longs: 2, shorts: 1 },
    { day: 29, pnl: -95, trades: 1, longs: 0, shorts: 1 }
  ]

  return entries.reduce<CalendarData>((acc, { day, pnl, trades, longs, shorts }) => {
    const dateKey = format(new Date(year, month, day), "yyyy-MM-dd")

    const tradeCount = Math.max(1, trades)
    const tradeStubs = Array.from({ length: tradeCount }).map((_, idx) => ({
      entryDate: new Date(year, month, day, 10 + idx * 2).toISOString(),
      pnl: pnl / tradeCount,
      commission: 2 + idx
    }))

    acc[dateKey] = {
      pnl,
      tradeNumber: trades,
      longNumber: longs,
      shortNumber: shorts,
      // Minimal trade stubs so the preview shows intra-day stats without
      // requiring full trade objects from the dashboard.
      trades: tradeStubs as any[]
    }

    return acc
  }, {})
}

export function CalendarFeaturePreview() {
  const calendarData = useMemo(() => buildDemoCalendarData(), [])

  return (
    <div className="h-full min-h-[380px] w-full overflow-hidden rounded-xl border bg-card shadow-sm pointer-events-none lg:min-h-[440px]">
      <DesktopCalendarPnl calendarData={calendarData} hideFiltersOnMobile />
    </div>
  )
}