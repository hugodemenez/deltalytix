'use client'

import { getTrades } from '@/server/database'
import { Trade } from '@prisma/client'
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react'
import { useUser } from './user-data'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns'

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

interface TradeDataContextProps {
  trades: Trade[]
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>
  isLoading: boolean
  refreshTrades: () => Promise<void>
}

interface FormattedTradeContextProps {
  formattedTrades: Trade[]
  instruments: string[]
  setInstruments: React.Dispatch<React.SetStateAction<string[]>>
  accountNumbers: string[]
  setAccountNumbers: React.Dispatch<React.SetStateAction<string[]>>
  dateRange: DateRange | undefined
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>
}

interface StatisticsContextProps {
  statistics: StatisticsProps
}

interface CalendarDataContextProps {
  calendarData: CalendarData
}

const TradeDataContext = createContext<TradeDataContextProps | undefined>(undefined)
const FormattedTradeContext = createContext<FormattedTradeContextProps | undefined>(undefined)
const StatisticsContext = createContext<StatisticsContextProps | undefined>(undefined)
const CalendarDataContext = createContext<CalendarDataContextProps | undefined>(undefined)

export const TradeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useUser()
  const [instruments, setInstruments] = useState<string[]>([])
  const [accountNumbers, setAccountNumbers] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const fetchTrades = useCallback(async () => {
    if (user) {
      setIsLoading(true)
      try {
        const tradesData = await getTrades(user.id)
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
    }
  }, [user])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const refreshTrades = useCallback(async () => {
    await fetchTrades()
  }, [fetchTrades])

  const formattedTrades = useMemo(() => {
    return trades
      .filter(trade => {
        const entryDate = parseISO(trade.entryDate)
        if (!isValid(entryDate)) return false

        if (instruments.length > 0 && !instruments.includes(trade.instrument)) return false
        if (accountNumbers.length > 0 && !accountNumbers.includes(trade.accountNumber)) return false
        
        if (dateRange?.from && dateRange?.to) {
          const start = startOfDay(dateRange.from)
          const end = endOfDay(dateRange.to)
          if (entryDate < start || entryDate > end) return false
        }
        
        return true
      })
      .sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime())
  }, [trades, instruments, accountNumbers, dateRange])

  const statistics = useMemo(() => calculateStatistics(formattedTrades), [formattedTrades])
  const calendarData = useMemo(() => formatCalendarData(formattedTrades), [formattedTrades])

  return (
    <TradeDataContext.Provider value={{ trades, setTrades, isLoading, refreshTrades }}>
      <FormattedTradeContext.Provider value={{
        formattedTrades,
        instruments,
        setInstruments,
        accountNumbers,
        setAccountNumbers,
        dateRange,
        setDateRange
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