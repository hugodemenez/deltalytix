'use client'

import React from "react"
import ResponsiveCalendarPnl from "./desktop-calendar"
import { useData } from "@/context/data-provider"

export default function CalendarPnl() {
  const { calendarData } = useData()

  return <ResponsiveCalendarPnl calendarData={calendarData} hideFiltersOnMobile />
}
