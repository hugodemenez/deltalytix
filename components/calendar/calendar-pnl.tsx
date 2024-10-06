'use client'

import React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import MobileCalendarPnl from "./mobile-calendar-pnl";
import DesktopCalendarPnl from "./desktop-calendar-pnl";
import { Trade } from "@prisma/client";

export type CalendarEntry = {
  pnl: number;
  tradeNumber: number;
  longNumber: number;
  shortNumber: number;
  trades: Trade[];
};

export type CalendarData = {
  [date: string]: CalendarEntry;
};

export default function CalendarPnl({ calendarData }: { calendarData: CalendarData }) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return isMobile ? (
    <MobileCalendarPnl calendarData={calendarData} />
  ) : (
    <DesktopCalendarPnl calendarData={calendarData} />
  )
}