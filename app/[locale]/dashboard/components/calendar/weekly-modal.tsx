'use client'

import React, { useState } from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { fr, enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"
import { Charts } from "./charts"
import { useI18n, useCurrentLocale } from "@/locales/client"

interface WeeklyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  calendarData: CalendarData;
  isLoading: boolean;
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
  const [activeTab, setActiveTab] = useState("charts")

  // Aggregate weekly data
  const weeklyData = React.useMemo(() => {
    if (!selectedDate) return { trades: [], tradeNumber: 0, pnl: 0, longNumber: 0, shortNumber: 0 }

    const trades: any[] = []
    const weekStart = startOfWeek(selectedDate)
    const weekEnd = endOfWeek(selectedDate)

    // Collect all trades for the week
    for (const [dateString, dayData] of Object.entries(calendarData)) {
      const date = new Date(dateString)
      if (date >= weekStart && date <= weekEnd && dayData.trades) {
        trades.push(...(dayData.trades as any[]))
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
  }, [selectedDate, calendarData])

  if (!selectedDate || !isOpen) return null;

  // Get start and end of week
  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)
  const dateRange = `${format(weekStart, 'MMMM d', { locale: dateLocale })} - ${format(weekEnd, 'MMMM d, yyyy', { locale: dateLocale })}`

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-dvh sm:h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{dateRange}</DialogTitle>
          <DialogDescription>
            {t('calendar.modal.weeklyDetails')}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="grow flex flex-col overflow-hidden">
          <TabsList className="px-6">
            <TabsTrigger value="charts">{t('calendar.modal.charts')}</TabsTrigger>
          </TabsList>
          <TabsContent value="charts" className="grow overflow-auto p-6 pt-2">
            <Charts dayData={weeklyData} isWeekly={true} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 