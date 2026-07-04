'use client'

import React from "react"
import DesktopCalendarPnl from "./desktop-calendar"
import { useData } from "@/context/data-provider"

export default function CalendarPnl() {
  const { calendarData } = useData()

  return <DesktopCalendarPnl calendarData={calendarData} hideFiltersOnMobile />
}
