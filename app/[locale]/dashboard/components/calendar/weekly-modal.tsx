'use client'

import React, { useState } from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { fr, enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarData, CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { Trade } from "@/prisma/generated/prisma/browser"
import { Charts } from "./charts"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { calendarDateKeyFromZoned } from "@/lib/calendar-timezone"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface WeeklyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  calendarData: CalendarData;
  isLoading: boolean;
}

const formatSignedCurrency = (value: number) => {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return value < 0 ? `-${formatted}` : `+${formatted}`
}

function WeeklyTabs({
  weeklyData,
  isLoading,
  layout,
}: {
  weeklyData: CalendarEntry;
  isLoading: boolean;
  layout: 'dialog' | 'drawer';
}) {
  const t = useI18n()
  const isDrawer = layout === 'drawer'
  const [activeTab, setActiveTab] = useState("charts")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
      <TabsList className={cn("shrink-0", isDrawer ? "mx-4 grid w-auto grid-cols-1" : "px-6")}>
        <TabsTrigger value="charts">{t('calendar.modal.charts')}</TabsTrigger>
      </TabsList>
      <TabsContent
        value="charts"
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain min-h-0",
          isDrawer ? "px-4 pt-2 pb-6" : "p-6 pt-2"
        )}
        data-vaul-no-drag
      >
        <Charts dayData={weeklyData} isWeekly={true} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  )
}

export function WeeklyModal({
  isOpen,
  onOpenChange,
  selectedDate,
  calendarData,
  isLoading,
}: WeeklyModalProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS
  const weekStartsOnMonday = locale === 'fr'
  const isDesktop = useMediaQuery("(min-width: 640px)")

  // Aggregate weekly data
  const weeklyData = React.useMemo<CalendarEntry>(() => {
    if (!selectedDate) return { trades: [], tradeNumber: 0, pnl: 0, longNumber: 0, shortNumber: 0 }

    const trades: Trade[] = []
    const weekStartsOn = weekStartsOnMonday ? 1 : 0
    const weekStart = startOfWeek(selectedDate, { weekStartsOn })
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn })
    const weekStartKey = calendarDateKeyFromZoned(weekStart)
    const weekEndKey = calendarDateKeyFromZoned(weekEnd)

    // Collect all trades for the week
    for (const [dateString, dayData] of Object.entries(calendarData)) {
      if (dateString >= weekStartKey && dateString <= weekEndKey && dayData.trades) {
        trades.push(...dayData.trades)
      }
    }

    // Calculate long and short numbers
    const longNumber = trades.filter(trade => trade.side?.toLowerCase() === 'long').length
    const shortNumber = trades.filter(trade => trade.side?.toLowerCase() === 'short').length

    return {
      trades,
      tradeNumber: trades.length,
      pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
      longNumber,
      shortNumber,
    }
  }, [selectedDate, calendarData, weekStartsOnMonday])

  if (!selectedDate || !isOpen) return null;

  // Get start and end of week
  const weekStartsOn = weekStartsOnMonday ? 1 : 0
  const weekStart = startOfWeek(selectedDate, { weekStartsOn })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn })
  const dateRange = `${format(weekStart, 'MMMM d', { locale: dateLocale })} - ${format(weekEnd, 'MMMM d, yyyy', { locale: dateLocale })}`

  if (!isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col">
          <DrawerHeader className="shrink-0 px-4 pt-3 pb-2 text-left">
            <div className="flex items-baseline justify-between gap-3">
              <DrawerTitle className="text-base capitalize truncate">{dateRange}</DrawerTitle>
              <span className={cn(
                "text-sm font-semibold shrink-0",
                weeklyData.pnl >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatSignedCurrency(weeklyData.pnl)}
              </span>
            </div>
            <DrawerDescription className="text-xs">
              {weeklyData.tradeNumber > 0
                ? `${weeklyData.tradeNumber} ${weeklyData.tradeNumber > 1 ? t('calendar.trades') : t('calendar.trade')}`
                : t('calendar.modal.noTrades')}
            </DrawerDescription>
          </DrawerHeader>
          <WeeklyTabs weeklyData={weeklyData} isLoading={isLoading} layout="drawer" />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{dateRange}</DialogTitle>
          <DialogDescription>
            {t('calendar.modal.weeklyDetails')}
          </DialogDescription>
        </DialogHeader>
        <WeeklyTabs weeklyData={weeklyData} isLoading={isLoading} layout="dialog" />
      </DialogContent>
    </Dialog>
  )
}
