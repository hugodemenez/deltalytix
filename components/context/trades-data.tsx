'use client'

import { getTrades } from '@/server/database'
import { Trade } from '@prisma/client'
import React, { createContext, useState, useContext, useEffect, Dispatch, SetStateAction, useCallback, useMemo } from 'react'
import { useUser } from './user-data'

interface DateRange {
  from: Date
  to: Date
}

interface TradeDataContextProps {
  trades: Trade[]
  setTrades: Dispatch<SetStateAction<Trade[]>>
  refreshTrades: () => Promise<void>
}

interface FormattedTradeContextProps {
  formattedTrades: Trade[]
  instruments: string[]
  setInstruments: Dispatch<SetStateAction<string[]>>
  accountNumbers: string[]
  setAccountNumbers: Dispatch<SetStateAction<string[]>>
  dateRange: DateRange | undefined
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>
}

const TradeDataContext = createContext<TradeDataContextProps | undefined>(undefined)
const FormattedTradeContext = createContext<FormattedTradeContextProps | undefined>(undefined)

export const TradeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trades, setTrades] = useState<Trade[]>([])
  const { user } = useUser()
  const [instruments, setInstruments] = useState<string[]>([])
  const [accountNumbers, setAccountNumbers] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const fetchTrades = useCallback(async () => {
    if (user) {
      const tradesData = await getTrades(user.id)
      setTrades(tradesData)

      // Initialize dateRange based on fetched trades
      if (tradesData.length > 0) {
        const dates = tradesData.map(trade => new Date(trade.entryDate))
        const minDate = new Date(Math.min(...dates.map(date => date.getTime())))
        const maxDate = new Date(Math.max(
          ...dates.map(date => date.getTime()),
          new Date().getTime() // Include today's date
        ))
        setDateRange({ from: minDate, to: maxDate })
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
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
      .filter((trade) => {
        const buyDate = new Date(trade.entryDate)
        if (isNaN(buyDate.getTime())) return false
        if (!(instruments.length===0) && !instruments.includes(trade.instrument)) return false
        if (!(accountNumbers.length===0) && !accountNumbers.includes(trade.accountNumber)) return false
        if (dateRange?.from && dateRange?.to) {
          if (buyDate < dateRange.from || buyDate > dateRange.to) return false
        }
        return true
      })
  }, [trades, instruments, accountNumbers, dateRange])

  return (
    <TradeDataContext.Provider value={{ trades, setTrades, refreshTrades }}>
      <FormattedTradeContext.Provider value={{
        formattedTrades,
        instruments,
        setInstruments,
        accountNumbers,
        setAccountNumbers,
        dateRange,
        setDateRange
      }}>
        {children}
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