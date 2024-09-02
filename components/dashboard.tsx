'use client'
import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Percent, TrendingUp, Award, Calendar as CalendarIcon, X, Clock, PiggyBank } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trade } from '@prisma/client'
import ImportButton from './import-button'
import CalendarPnl from './calendar-pnl'
import { User } from '@supabase/supabase-js'
import DailyChart from './daily-chart'
import SmartImportButton from './smart-import-button'


export default function Dashboard({ trades }: { trades: Trade[], user: User }) {
  const [instrument, setInstrument] = useState<string>("all")
  const [accountNumber, setAccountNumber] = useState<string>("all")
  const [formattedTrades, setFormattedTrades] = useState<Trade[]>(trades.sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime()))
  // Set default range to first month of the data in formattedTrades
  const firstTradeDate = formattedTrades.length > 0 ? new Date(formattedTrades[0].buyDate) : new Date()
  const lastTradeDate = formattedTrades.length > 0 ? new Date(formattedTrades[formattedTrades.length - 1].buyDate) : new Date()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: firstTradeDate,
    to: lastTradeDate
  })

  useEffect(() => {
    let newFormattedTrades = trades.sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
    newFormattedTrades = newFormattedTrades.filter((trade: any) => {
      if (instrument !== "all" && trade.instrument !== instrument) return false;
      if (accountNumber !== "all" && trade.accountNumber !== accountNumber) return false;
      if (dateRange && (new Date(trade.buyDate) < dateRange.from! || new Date(trade.buyDate) > dateRange.to!)) return false;
      return true;
    });

    setFormattedTrades(newFormattedTrades);
  }, [trades, instrument, accountNumber, dateRange])


  // from formattedTrades create statistics
  const statistics = formattedTrades.reduce((acc: any, trade: Trade) => {
    const pnl = parseFloat(trade.pnl.replace('(', '-').replace(')', '').replace('$', ''));
    acc.pnl = pnl;
    if (pnl < 0) {
      acc.winningStreak = 0;
    }
    acc.nbTrades++;
    acc.cumulativePnl += pnl;
    acc.cumulativeFees += trade.quantity * 0.97 * 2;
    acc.nbBe += pnl === 0 ? 1 : 0;
    acc.nbWin += pnl > 0 ? 1 : 0;
    acc.nbLoss += pnl < 0 ? 1 : 0;
    acc.winningStreak += pnl > 0 ? 1 : 0;
    if (acc.nbWin + acc.nbLoss > 0) {
      acc.winRate = acc.nbWin / (acc.nbWin + acc.nbLoss) * 100;
    }
    acc.totalPositionTime += trade.timeInPosition;
    return acc;
  }, { cumulativeFees: 0, cumulativePnl: 0, winningStreak: 0, winRate: 0, nbTrades: 0, nbBe: 0, nbWin: 0, nbLoss: 0, totalPositionTime: 0 });
  


  function parsePositionTime(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutesLeft = Math.floor((timeInSeconds - (hours * 3600)) / 60);
    const secondsLeft = timeInSeconds - (hours * 3600) - (minutesLeft * 60);
    // Check if hours, minutesLeft seconds lefts aren't NaN
    if (isNaN(hours) || isNaN(minutesLeft) || isNaN(secondsLeft)) {
      return '0';
    }
    return `${hours}h ${minutesLeft}m ${secondsLeft}s`;
  }
  // Parse back seconds to HH:mm:ss
  const timeInSeconds = Math.round(statistics.totalPositionTime / formattedTrades.length);

  const formattedAveragePositionTime = parsePositionTime(timeInSeconds);

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



  return (
    <div className="container mx-auto p-4">
      <div className='w-full flex justify-between items-center mb-4'>
      </div>

      <div className="flex flex-col sm:flex-row gap-y-4 justify-between items-center mb-4">
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
        <div className='flex gap-x-4'>
          <Select value={accountNumber} onValueChange={setAccountNumber}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {
                // Group by instrument
                trades.reduce((acc: any, trade: any) => {
                  if (!acc.includes(trade.accountNumber)) {
                    acc.push(trade.accountNumber)
                  }
                  return acc
                }
                  , []).map((accountNumber: any) => (
                    <SelectItem key={accountNumber} value={accountNumber}>{accountNumber}</SelectItem>
                  ))
              }
            </SelectContent>
          </Select>
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
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
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
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedAveragePositionTime}</div>
            <p className="text-xs text-muted-foreground"></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumulative PnL</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
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
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(statistics.nbWin / statistics.nbTrades * 100).toFixed(2)}%` }}></div>
              </div>
              <span className="text-2xl font-bold">{(statistics.nbWin / statistics.nbTrades * 100).toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loss Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(statistics.nbLoss / statistics.nbTrades * 100).toFixed(2)}%` }}></div>
              </div>
              <span className="text-2xl font-bold">{(statistics.nbLoss / statistics.nbTrades * 100).toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BreakEven Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(statistics.nbBe / statistics.nbTrades * 100).toFixed(2)}%` }}></div>
              </div>
              <span className="text-2xl font-bold">{(statistics.nbBe / statistics.nbTrades * 100).toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className='mb-4'>
      <DailyChart dailyTradingData={calendarData}/>
      </div>

      <CalendarPnl
        dateRange={{
          from: dateRange?.from || new Date(),
          to: dateRange?.to || new Date(),
        }}
        calendarData={calendarData}></CalendarPnl>

    </div>
  )
}