'use client'

import React, { useState } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, parsePositionTime } from "@/lib/utils"
import { Trade } from "@prisma/client"
import Chat from "./chat"
import { CalendarEntry } from "@/types/calendar"
import { Charts } from "./charts"

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
  const [activeTab, setActiveTab] = useState("table")

  if (!selectedDate) return null;

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[100dvh] sm:h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{format(selectedDate, 'MMMM d, yyyy')}</DialogTitle>
          <DialogDescription>
            Trade details and performance analysis for this day.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="px-6">
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="reflection">Reflection</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="flex-grow overflow-auto p-6 pt-2">
            <ScrollArea className="h-full">
              {dayData && dayData.trades?.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupTradesByAccount(dayData.trades)).map(([account, trades]) => (
                    <div key={account}>
                      <h3 className="font-semibold mb-2">Account: {account}</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky top-0 bg-background z-10">Instrument</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">Side</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">Quantity</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">PnL</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">Commission</TableHead>
                            <TableHead className="sticky top-0 bg-background z-10">Time in Position</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trades.map((trade: Trade) => (
                            <TableRow key={trade.id}>
                              <TableCell>{trade.instrument}</TableCell>
                              <TableCell>{trade.side}</TableCell>
                              <TableCell>{trade.quantity}</TableCell>
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
                            <TableCell colSpan={3}>Total</TableCell>
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
                <p>No trades for this day.</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reflection" className="flex-grow overflow-hidden sm:p-6 pt-2">
            <Chat dayData={dayData} dateString={dateString}></Chat>
          </TabsContent>
          <TabsContent value="charts" className="flex-grow overflow-auto p-6 pt-2">
            <Charts dayData={dayData} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}