'use client'
import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown, Percent, TrendingUp, Award, Calendar as CalendarIcon, X } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CSVImporter } from "csv-import-react";
import { PrismaClient, Trade } from '@prisma/client'
import CsvImporter from './csv-importer'
import { Bar, BarChart } from "recharts"
import DailyPnlChart from './dailyPnlChart'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Dashboard({ trades }: { trades: Trade[] }) {
  const [instrument, setInstrument] = useState<string>("all")
  const [tradesData, setTradesData] = useState<Trade[]>(trades)
  var formattedTrades = trades.sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime())
  formattedTrades = formattedTrades.filter((trade: any) => {
    if (instrument === "all") return true
    return trade.instrument === instrument
  }
  )
  // Set default range to first month of the data in formattedTrades
  const [firstTradeDate,setFirstTradeDate] = useState<Date>(formattedTrades.length > 0 ? new Date(formattedTrades[0].buyDate) : new Date())
  const lastTradeDate = formattedTrades.length > 0 ? new Date(formattedTrades[formattedTrades.length - 1].buyDate) : new Date()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: firstTradeDate,
    to: lastTradeDate
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [comment, setComment] = useState<string>("")


  // formattedTrades is Array (2)
  // 0 {id: 1, instrument: "ZNU4", buyPrice: "110 105", sellPrice: "110 110", buyDate: "06/26/2024 09:50:20", …}
  // buyDate: "06/26/2024 09:50:20"
  // buyPrice: "110 105"
  // id: 1
  // instrument: "ZNU4"
  // pnl: "$46.88"
  // sellDate: "06/26/2024 09:51:38"
  // sellPrice: "110 110"
  // timeInPosition: "1min 18sec"
  // 1 {id: 2, instrument: "ZNU4", buyPrice: "110 060", sellPrice: "110 065", buyDate: "06/28/2024 09:43:16", …}

  // from formattedTrades create statistics
  const statistics = formattedTrades.reduce((acc: any, trade: Trade) => {
    // PnL can be pnl: "$(78.12)" or pnl: "$46.88"
    acc.pnl = parseFloat(trade.pnl.replace('(', '-').replace(')', '').replace('$', ''))
    if (acc.pnl < 0) {
      acc.winningStreak = 0
    }
    acc.cumulativePnl += acc.pnl
    acc.cumulativeFees += trade.quantity * 0.97 * 2
    acc.nbWin += acc.pnl > 0 ? 1 : 0
    acc.nbLoss += acc.pnl < 0 ? 1 : 0
    acc.winningStreak += acc.pnl > 0 ? 1 : 0
    if (acc.nbWin + acc.nbLoss > 0) {
      acc.winRate = acc.nbWin / (acc.nbWin + acc.nbLoss) * 100
    }
    // Parse timeInPosition
    const timeInPosition = trade.timeInPosition;
    const minutesMatch = timeInPosition.match(/(\d+)min/);
    const secondsMatch = timeInPosition.match(/(\d+)sec/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    const timeInSeconds = (minutes * 60) + seconds;

    acc.totalPositionTime += timeInSeconds;
    // acc.averagePositionTime += trade.timeInPosition / (acc.nbWin + acc.nbLoss)
    // Compute short cumulativePnl
    return acc
  }
    , { cumulativeFees: 0, cumulativePnl: 0, winningStreak: 0, winRate: 0, nbWin: 0, nbLoss: 0, totalPositionTime: 0 })

  // Parse back seconds to HH:mm:ss
  const timeInSeconds = Math.round(statistics.totalPositionTime / formattedTrades.length);
  const hours = Math.floor(timeInSeconds / 3600);
  const minutesLeft = Math.floor((timeInSeconds - (hours * 3600)) / 60);
  const secondsLeft = timeInSeconds - (hours * 3600) - (minutesLeft * 60);
  const formattedAveragePositionTime = `${hours}h ${minutesLeft}m ${secondsLeft}s`;

  // eachEntry is a date containing all formattedTrades for that day
  const calendarData = formattedTrades.reduce((acc: any, trade: Trade) => {
    const date = format(new Date(trade.buyDate), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = { pnl: 0, tradeNumber: 0, longNumber: 0, shortNumber: 0 }
    }
    var pnl = trade.pnl
    if (pnl.includes('(')) {
      pnl = pnl.replace('(', '-').replace(')', '')
    }
    acc[date].pnl += parseFloat(pnl.replace('$', '')) - (trade.quantity * 0.97 * 2);
    acc[date].tradeNumber++

    // Chck if trade.buyDate<trade.sellDate

    const isLong = new Date(trade.buyDate) < new Date(trade.sellDate)
    acc[date].longNumber += isLong ? 1 : 0
    acc[date].shortNumber += isLong ? 0 : 1

    return acc
  }
    , {})

  const calendarDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return []
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
  }, [dateRange])

  const handleSaveComment = () => {
    // Here you would typically save the comment to your backend
    console.log(`Saving comment for ${selectedDate}: ${comment}`)
    setComment("")
    setSelectedDate(null)
  }
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="container mx-auto p-4">
      <div className='w-full flex justify-between'>
        <h1 className="text-2xl font-bold mb-4">Trading Analysis Dashboard</h1>
        <CsvImporter></CsvImporter>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Winning Streak</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.winningStreak}</div>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Position Time</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedAveragePositionTime}</div>
            <p className="text-xs text-muted-foreground"></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumulative PnL</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(statistics.cumulativePnl - statistics.cumulativeFees).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Since first import</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${statistics.winRate.toFixed(2)}%` }}></div>
              </div>
              <span className="text-2xl font-bold">{statistics.winRate.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className='mb-4'>
        <DailyPnlChart dailyTradingData={calendarData}></DailyPnlChart>
      </div>
      <div className="flex justify-between items-center mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <Select value={instrument} onValueChange={setInstrument}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select instrument" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Instruments</SelectItem>
            {
              // Group by instrument
              trades.reduce((acc: any, trade: any) => {
                if (!acc.includes(trade.instrument)) {
                  acc.push(trade.instrument)
                }
                return acc
              }
                , []).map((instrument: any) => (
                  <SelectItem key={instrument} value={instrument}>{instrument}</SelectItem>
                ))
            }
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-7 gap-4">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center font-semibold">{day}</div>
        ))}
        {calendarDays.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd')
          const dayData = calendarData[dateString]
          const dayOfWeek = getDay(date)
          const isFirstDay = index === 0

          return (
            <React.Fragment key={dateString}>
              {isFirstDay && dayOfWeek !== 0 && (
                <div className="col-span-7" style={{ gridColumnStart: 1, gridColumnEnd: dayOfWeek + 1 }}></div>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Card className={cn(
                    "h-24 cursor-pointer hover:border-primary transition-colors",
                    dayData ? (dayData.pnl >= 0 ? "bg-green-50" : "bg-red-50") : "",
                    // !isSameMonth(date, dateRange?.from || new Date()) && "opacity-50"
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
                            ${parseFloat(dayData.pnl.toFixed(2))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dayData.tradeNumber} trade{dayData.formattedTrades > 1 ? 's' : ''}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No formattedTrades</div>
                      )}
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{format(date, 'MMMM d, yyyy')}</DialogTitle>
                    <DialogDescription>
                      Add a comment for this day or view trade details.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="col-span-4"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSaveComment}>Save comment</Button>
                    <Button variant="outline" onClick={() => window.open(`/formattedTrades/${dateString}`, '_blank')}>
                      View Details
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}