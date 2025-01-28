'use client'

import { getTrades } from '@/server/database'
import { Trade } from '@prisma/client'
import { getTickDetails } from '@/server/tick-details'
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns'
import { getShared, SharedParams } from '@/server/shared'
import { useParams } from 'next/navigation'
import { formatInTimeZone } from 'date-fns-tz'

// Inferred types
type StatisticsProps = {
  cumulativeFees: number
  cumulativePnl: number
  winningStreak: number
  winRate: number
  nbTrades: number
  nbBe: number
  nbWin: number
  nbLoss: number
  totalPositionTime: number
  averagePositionTime: string
}

type CalendarData = {
  [date: string]: {
    pnl: number
    tradeNumber: number
    longNumber: number
    shortNumber: number
    trades: Trade[]
  }
}

interface DateRange {
  from: Date
  to: Date
}

interface TickRange {
  min: number | undefined
  max: number | undefined
}

interface PnlRange {
  min: number | undefined
  max: number | undefined
}



interface TradeDataContextProps {
  trades: Trade[]
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>
  isLoading: boolean
  refreshTrades: () => Promise<void>
  updateTrade: (tradeId: string, updates: Partial<Trade>) => void
  isSharedView: boolean
  sharedParams: SharedParams | null
}

interface FormattedTradeContextProps {
  formattedTrades: Trade[]
  instruments: string[]
  setInstruments: React.Dispatch<React.SetStateAction<string[]>>
  accountNumbers: string[]
  setAccountNumbers: React.Dispatch<React.SetStateAction<string[]>>
  dateRange: DateRange | undefined
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>
  tickRange: TickRange
  setTickRange: React.Dispatch<React.SetStateAction<TickRange>>
  pnlRange: PnlRange
  setPnlRange: React.Dispatch<React.SetStateAction<PnlRange>>
}

interface StatisticsContextProps {
  statistics: StatisticsProps
}

interface CalendarDataContextProps {
  calendarData: CalendarData
}

interface TickDetail {
  ticker: string
  tickValue: number
}

const TradeDataContext = createContext<TradeDataContextProps | undefined>(undefined)
const FormattedTradeContext = createContext<FormattedTradeContextProps | undefined>(undefined)
const StatisticsContext = createContext<StatisticsContextProps | undefined>(undefined)
const CalendarDataContext = createContext<CalendarDataContextProps | undefined>(undefined)

export const TradeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [instruments, setInstruments] = useState<string[]>([])
  const [accountNumbers, setAccountNumbers] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [tickDetails, setTickDetails] = useState<Record<string, number>>({})
  const [tickRange, setTickRange] = useState<TickRange>({ min: undefined, max: undefined })
  const [pnlRange, setPnlRange] = useState<PnlRange>({ min: undefined, max: undefined })
  const [isSharedView, setIsSharedView] = useState(false)
  const [sharedParams, setSharedParams] = useState<SharedParams | null>(null)
  const [sharedTrades, setSharedTrades] = useState<Trade[]>([])
  const params = useParams()

  const fetchTrades = useCallback(async () => {
    setIsLoading(true)
    try {
      // Check if we're on a shared page
      if (params?.slug) {
        console.log("fetching shared trades")
        const sharedData = await getShared(params.slug as string)
        if (sharedData) {
          console.log('sharedData', sharedData)
          setSharedTrades(sharedData.trades)
          setTrades(sharedData.trades)
          setSharedParams(sharedData.params as SharedParams)
          setIsSharedView(true)
          setIsLoading(false)
          return
        }
      }

      // Regular user trades fetch
      const tradesData = await getTrades()
      setTrades(tradesData)

        if (tradesData.length > 0) {
          const dates = tradesData
            .map(trade => parseISO(trade.entryDate))
            .filter(date => isValid(date))

          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map(date => date.getTime())))
            const maxDate = new Date(Math.max(
              ...dates.map(date => date.getTime()),
              new Date().getTime()
            ))
            setDateRange({ from: startOfDay(minDate), to: endOfDay(maxDate) })
          }
        }
      
    } catch (error) {
      console.error('Error fetching trades:', error)
    } finally {
      setIsLoading(false)
    }
  }, [params?.slug])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  React.useEffect(() => {
    getTickDetails().then((details: TickDetail[]) => {
      const tickMap = details.reduce((acc: Record<string, number>, detail: TickDetail) => {
        acc[detail.ticker] = detail.tickValue
        return acc
      }, {})
      setTickDetails(tickMap)
    })
  }, [])

  const refreshTrades = useCallback(async () => {
    await fetchTrades()
  }, [fetchTrades])

  const formattedTrades = useMemo(() => {
    if(isSharedView) {
      return sharedTrades.filter(trade => 
        accountNumbers.length === 0 || accountNumbers.includes(trade.accountNumber)
      )
    }

    return trades
      .filter(trade => {
        const entryDate = parseISO(trade.entryDate)
        if (!isValid(entryDate)) return false

        // Get user's timezone
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // Convert the dates to the user's timezone for comparison
        const entryDateInUserTz = new Date(formatInTimeZone(entryDate, userTimeZone, 'yyyy-MM-dd HH:mm:ssXXX'))
        const fromDateInUserTz = dateRange?.from ? new Date(formatInTimeZone(dateRange.from, userTimeZone, 'yyyy-MM-dd HH:mm:ssXXX')) : null
        const toDateInUserTz = dateRange?.to ? new Date(formatInTimeZone(dateRange.to, userTimeZone, 'yyyy-MM-dd HH:mm:ssXXX')) : null

        // Regular filtering
        const matchesInstruments = instruments.length === 0 || instruments.includes(trade.instrument)
        const matchesAccounts = accountNumbers.length === 0 || accountNumbers.includes(trade.accountNumber)
        const matchesDateRange = !fromDateInUserTz || !toDateInUserTz || (
          entryDateInUserTz >= startOfDay(fromDateInUserTz) && 
          entryDateInUserTz <= endOfDay(toDateInUserTz)
        )
        const matchesPnlRange = (
          (pnlRange.min === undefined || trade.pnl >= pnlRange.min) &&
          (pnlRange.max === undefined || trade.pnl <= pnlRange.max)
        )
        
        return matchesInstruments && matchesAccounts && matchesDateRange && matchesPnlRange
      })
      .sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime())
  }, [trades, instruments, accountNumbers, dateRange, pnlRange, isSharedView, sharedParams])

  const statistics = useMemo(() => calculateStatistics(formattedTrades), [formattedTrades])
  const calendarData = useMemo(() => formatCalendarData(formattedTrades), [formattedTrades])

  const updateTrade = useCallback((tradeId: string, updates: Partial<Trade>) => {
    setTrades(prevTrades => 
      prevTrades.map(trade => 
        trade.id === tradeId ? { ...trade, ...updates } : trade
      )
    )
  }, [])

  return (
    <TradeDataContext.Provider value={{ 
      trades, 
      setTrades, 
      isLoading, 
      refreshTrades, 
      updateTrade,
      isSharedView,
      sharedParams
    }}>
      <FormattedTradeContext.Provider value={{
        formattedTrades,
        instruments,
        setInstruments,
        accountNumbers,
        setAccountNumbers,
        dateRange,
        setDateRange,
        tickRange,
        setTickRange,
        pnlRange,
        setPnlRange
      }}>
        <StatisticsContext.Provider value={{ statistics }}>
          <CalendarDataContext.Provider value={{ calendarData }}>
            {children}
          </CalendarDataContext.Provider>
        </StatisticsContext.Provider>
      </FormattedTradeContext.Provider>
    </TradeDataContext.Provider>
  )
}

export const useTrades = () => {
  const context = useContext(TradeDataContext)
  if (!context) {
    throw new Error('useTrades must be used within a TradeDataProvider')
  }
  return context
}

export const useFormattedTrades = () => {
  const context = useContext(FormattedTradeContext)
  if (!context) {
    throw new Error('useFormattedTrades must be used within a TradeDataProvider')
  }
  return context
}

export const useTradeStatistics = () => {
  const context = useContext(StatisticsContext)
  if (!context) {
    throw new Error('useTradeStatistics must be used within a TradeDataProvider')
  }
  return context
}

export const useCalendarData = () => {
  const context = useContext(CalendarDataContext)
  if (!context) {
    throw new Error('useCalendarData must be used within a TradeDataProvider')
  }
  return context
}