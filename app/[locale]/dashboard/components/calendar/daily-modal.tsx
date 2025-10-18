'use client'

import React, { useState } from "react"
import { format } from "date-fns"
import { fr, enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, parsePositionTime } from "@/lib/utils"
import { Trade } from "@prisma/client"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { Charts } from "./charts"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { DailyStats } from "./daily-stats"
import { DailyComment } from "./daily-comment"
import { useUserStore } from "../../../../../store/user-store"

interface CalendarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  dayData: CalendarEntry | undefined;
  isLoading: boolean;
}

interface GroupedTrades {
  [accountNumber: string]: Trade[];
}

function groupTradesByAccount(trades: Trade[]): GroupedTrades {
  return trades.reduce((acc: GroupedTrades, trade) => {
    const account = trade.accountNumber || 'Unknown Account';
    if (!acc[account]) {
      acc[account] = [];
    }
    acc[account].push(trade);
    return acc;
  }, {});
}

export function CalendarModal({
  isOpen,
  onOpenChange,
  selectedDate,
  dayData,
  isLoading,
}: CalendarModalProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = locale === 'fr' ? fr : enUS
  const [activeTab, setActiveTab] = useState("comment")
  const [formattedDate, setFormattedDate] = useState<string>("")

  React.useEffect(() => {
    if (selectedDate) {
      setFormattedDate(format(selectedDate, 'MMMM d, yyyy', { locale: dateLocale }))
    }
  }, [selectedDate])

  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-dvh sm:h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{formattedDate}</DialogTitle>
          <DialogDescription>
            {t('calendar.modal.tradeDetails')}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="grow flex flex-col overflow-hidden">
          <TabsList className="px-6">
            <TabsTrigger value="comment">{t('calendar.modal.comment')}</TabsTrigger>
            <TabsTrigger value="table">{t('calendar.modal.table')}</TabsTrigger>
            <TabsTrigger value="analysis">{t('calendar.modal.analysis')}</TabsTrigger>
          </TabsList>
          <TabsContent value="comment" className="grow overflow-hidden p-6 pt-2 h-full flex flex-col">
            <DailyComment dayData={dayData} selectedDate={selectedDate} />
          </TabsContent>
          <TabsContent value="table" className="grow overflow-auto p-6 pt-2">
            <ScrollArea className="h-full">
              {dayData && dayData.trades?.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupTradesByAccount(dayData.trades)).map(([account, trades]) => (
                    <div key={account}>
                      <h3 className="font-semibold mb-2">{t('calendar.modal.account')}: {account}</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.instrument')}</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.side')}</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.quantity')}</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.entryPrice')}</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.exitPrice')}</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.pnl')}</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.commission')}</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">{t('calendar.modal.timeInPosition')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trades.map((trade: Trade) => (
                            <TableRow key={trade.id}>
                              <TableCell>{trade.instrument}</TableCell>
                              <TableCell>{trade.side}</TableCell>
                              <TableCell>{trade.quantity}</TableCell>
                              <TableCell>${trade.entryPrice}</TableCell>
                              <TableCell>${trade.closePrice}</TableCell>
                              <TableCell className={cn(
                                trade.pnl >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              )}>
                                ${trade.pnl.toFixed(2)}
                              </TableCell>
                              <TableCell>${(trade.commission).toFixed(2)}</TableCell>
                              <TableCell>{parsePositionTime(trade.timeInPosition)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-medium">
                            <TableCell colSpan={5}>{t('calendar.modal.total')}</TableCell>
                            <TableCell className={cn(
                              trades.reduce((sum, trade) => sum + trade.pnl, 0) >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            )}>
                              ${trades.reduce((sum, trade) => sum + trade.pnl, 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              ${trades.reduce((sum, trade) => sum + trade.commission, 0).toFixed(2)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              ) : (
                <p>{t('calendar.modal.noTrades')}</p>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="analysis" className="grow overflow-auto p-6 pt-2 space-y-4">
            <DailyStats dayData={dayData} isWeekly={false} />
            {/* <DailyMood dayData={dayData} isWeekly={false} selectedDate={selectedDate} /> */}
            <Charts dayData={dayData} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}