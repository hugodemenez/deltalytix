'use client'

import React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import MobileCalendarPnl from "./mobile-calendar";
import DesktopCalendarPnl from "./desktop-calendar";
import { useUserData } from "@/components/context/user-data";

export default function CalendarPnl() {
  const { calendarData } = useUserData()
  const isMobile = useMediaQuery("(max-width: 640px)")

  return isMobile ? (
    <MobileCalendarPnl calendarData={calendarData} />
  ) : (
    <DesktopCalendarPnl calendarData={calendarData} />
  )
}