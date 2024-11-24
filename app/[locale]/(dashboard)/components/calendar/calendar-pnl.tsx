'use client'

import React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import MobileCalendarPnl from "./mobile-calendar-pnl";
import DesktopCalendarPnl from "./desktop-calendar-pnl";
import { useCalendarData } from "@/components/context/trades-data";

export default function CalendarPnl() {
  const { calendarData } = useCalendarData()
  const isMobile = useMediaQuery("(max-width: 640px)")

  return isMobile ? (
    <MobileCalendarPnl calendarData={calendarData} />
  ) : (
    <DesktopCalendarPnl calendarData={calendarData} />
  )
}