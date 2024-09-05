'use client'

import React, { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { eachDayOfInterval, format, getDay, isToday } from "date-fns"
import { Badge } from "./ui/badge"
import { cn, parsePositionTime } from "@/lib/utils"
import { Button } from "./ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { ScrollArea } from "./ui/scroll-area"
import { Loader2 } from "lucide-react"
import { Trade } from "@prisma/client"
import { updateTradesWithComment } from "@/server/database"
import { toast } from "@/hooks/use-toast"

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

export default function CalendarPnl({dateRange, calendarData}: {dateRange: {from: Date, to: Date}, calendarData: CalendarData}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [aiComment, setAiComment] = useState<string>("")
  const [aiEmotion, setAiEmotion] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const calendarDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return []
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
  }, [dateRange])

  const handleGenerateComment = async (dayData: CalendarEntry, dateString: string) => {
    setIsLoading(true)
    try {
      const result = await updateTradesWithComment(dayData, dateString)
      setAiComment(result.comment)
      setAiEmotion(result.emotion)
      toast({
        title: "Comment Generated",
        description: "The AI comment has been generated and saved for all trades on this day.",
      })
    } catch (error) {
      console.error("Error generating and saving comment:", error)
      setAiComment("Failed to generate and save comment")
      setAiEmotion("Error")
      toast({
        title: "Error",
        description: "Failed to generate and save the AI comment.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const initializeComment = (dayData: CalendarEntry | undefined) => {
    if (dayData && dayData.trades.length > 0) {
      const lastTrade = dayData.trades[dayData.trades.length - 1]
      if (lastTrade.comment) {
        const commentParts = lastTrade.comment.split('(Emotion:')
        setAiComment(commentParts[0].trim())
        setAiEmotion(commentParts[1] ? commentParts[1].replace(')', '').trim() : '')
      } else {
        setAiComment("")
        setAiEmotion("")
      }
    } else {
      setAiComment("")
      setAiEmotion("")
    }
  }

  return(
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
      {WEEKDAYS.map((day) => (
        <div key={day} className="hidden sm:block text-center font-semibold">{day}</div>
      ))}
      {calendarDays.map((date, index) => {
        const dateString = format(date, 'yyyy-MM-dd')
        const dayData = calendarData[dateString]
        const dayOfWeek = getDay(date)
        const isFirstDay = index === 0

        return (
          <React.Fragment key={dateString}>
            {isFirstDay && dayOfWeek !== 0 && (
              <div className="hidden sm:block col-span-7" style={{ gridColumnStart: 1, gridColumnEnd: dayOfWeek + 1 }}></div>
            )}
            <Dialog open={selectedDate === date} onOpenChange={(open) => {
              if (open) {
                setSelectedDate(date)
                initializeComment(dayData)
              } else {
                setSelectedDate(null)
              }
            }}>
              <DialogTrigger asChild>
                <Card className={cn(
                  "block h-24 cursor-pointer hover:border-primary transition-colors",
                  dayData ? (dayData.pnl >= 0 ? "bg-green-50" : "bg-red-50") : "",
                )}>
                  <CardHeader className="p-2">
                    <CardTitle className="text-xs font-medium flex justify-between">
                      <span>{format(date, 'dd/MM/yyyy')}</span>
                      {isToday(date) && <Badge variant="outline">Today</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    {dayData ? (
                      <>
                        <div className={cn(
                          "text-sm font-bold",
                          dayData.pnl >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          ${dayData.pnl.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayData.tradeNumber} trade{dayData.tradeNumber > 1 ? 's' : ''}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">No trades</div>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{format(date, 'MMMM d, yyyy')}</DialogTitle>
                  <DialogDescription>
                    Trade details and AI-generated comment for this day.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex flex-col overflow-hidden">
                  <ScrollArea className="flex-grow">
                    <div className="space-y-4 pr-4">
                      {dayData && dayData.trades.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky top-0 bg-background z-10">Instrument</TableHead>
                              <TableHead className="sticky top-0 bg-background z-10">Side</TableHead>
                              <TableHead className="sticky top-0 bg-background z-10">PnL</TableHead>
                              <TableHead className="sticky top-0 bg-background z-10">Commission</TableHead>
                              <TableHead className="sticky top-0 bg-background z-10">Time in Position</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dayData.trades.map((trade: Trade) => (
                              <TableRow key={trade.id}>
                                <TableCell>{trade.instrument}</TableCell>
                                <TableCell>{trade.side}</TableCell>
                                <TableCell className={parseFloat(trade.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  ${parseFloat(trade.pnl).toFixed(2)}
                                </TableCell>
                                <TableCell>${trade.commission.toFixed(2)}</TableCell>
                                <TableCell>{parsePositionTime(trade.timeInPosition)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p>No trades for this day.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">AI-Generated Comment</h3>
                    {aiComment ? (
                      <>
                        <p>{aiComment}</p>
                        <p className="text-sm text-muted-foreground mt-1">Emotion: {aiEmotion}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No comment generated yet.</p>
                    )}
                  </div>
                  <Button 
                    onClick={() => handleGenerateComment(dayData, dateString)}
                    disabled={isLoading || !dayData}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating and Saving...
                      </>
                    ) : (
                      'Generate and Save AI Comment'
                    )}
                  </Button>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => window.open(`/trades/${dateString}`, '_blank')}>
                    View Full Details
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </React.Fragment>
        )
      })}
    </div>
  )
}