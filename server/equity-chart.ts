'use server'

import { createClient } from './auth'
import { prisma } from '@/lib/prisma'
import { formatInTimeZone } from 'date-fns-tz'
import { parseISO, eachDayOfInterval, startOfDay, endOfDay, isValid } from 'date-fns'
import { Payout as PrismaPayout } from '@/prisma/generated/prisma/client'

// Types matching the component
interface ChartDataPoint {
  date: string
  [key: `equity_${string}`]: number | undefined // Dynamic keys for account equities
  equity?: number // For grouped view
  dailyPnL?: number | undefined
  dailyCommissions?: number | undefined
  netPnL?: number | undefined
  // Payout and reset indicators
  [key: `payout_${string}`]: boolean // Payout indicators for each account
  [key: `reset_${string}`]: boolean // Reset indicators for each account
  [key: `payoutStatus_${string}`]: string // Payout status for each account
  [key: `payoutAmount_${string}`]: number // Payout amount for each account
}

// Chart event interface for payouts and resets
interface ChartEvent {
  date: Date
  amount: number
  isPayout: boolean
  isReset?: boolean
  payoutStatus?: string
  accountNumber: string
}

interface EquityChartParams {
  instruments: string[]
  accountNumbers: string[]
  dateRange?: { from: string, to: string }
  pnlRange: { min?: number, max?: number }
  tickRange: { min?: number, max?: number }
  timeRange: { range: string | null }
  tickFilter: { value: string | null }
  weekdayFilter: { days: number[] }
  hourFilter: { hour: number | null }
  tagFilter: { tags: string[] }
  timezone: string
  showIndividual: boolean
  maxAccounts: number
  dataSampling: 'all' | 'sample'
  selectedAccounts: string[]
}

interface EquityChartResult {
  chartData: ChartDataPoint[]
  accountNumbers: string[]
  dateRange: { startDate: string, endDate: string }
}

export async function getEquityChartDataAction(params: EquityChartParams): Promise<EquityChartResult> {
  console.log('getEquityChartDataAction')
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    // Use a Prisma transaction to fetch all needed data in a single DB roundtrip
    const [trades, accounts, groups] = await prisma.$transaction([
      prisma.trade.findMany({
        where: { userId: user.id },
        orderBy: { entryDate: 'desc' }
      }),
      prisma.account.findMany({
        where: { userId: user.id },
        include: { payouts: true }
      }),
      prisma.group.findMany({
        where: { userId: user.id },
        include: { accounts: true }
      }),
    ])

    // Get hidden accounts for filtering
    const hiddenGroup = groups.find(g => g.name === "Hidden Accounts")
    const hiddenAccountNumbers = accounts
      .filter(a => a.groupId === hiddenGroup?.id)
      .map(a => a.number)

    // Apply all filters in a single pass (same logic as DataProvider)
    const filteredTrades = trades.filter((trade) => {
      // Skip trades from hidden accounts
      if (hiddenAccountNumbers.includes(trade.accountNumber)) {
        return false
      }

      // Skip trades from not accountNumbers (filter is set)
      if (params.accountNumbers.length > 0 && !params.accountNumbers.includes(trade.accountNumber)) {
        return false
      }

      // Include all trades if  showIndividual is false
      if (!params.showIndividual) {
        return true
      }

      // Validate entry date
      const entryDate = new Date(formatInTimeZone(
        new Date(trade.entryDate),
        params.timezone,
        'yyyy-MM-dd HH:mm:ssXXX'
      ))
      if (!isValid(entryDate)) return false

      // Instrument filter
      if (params.instruments.length > 0 && !params.instruments.includes(trade.instrument)) {
        return false
      }

      // Account filter
      if (params.accountNumbers.length > 0 && !params.accountNumbers.includes(trade.accountNumber)) {
        return false
      }

      // Date range filter
      if (params.dateRange?.from || params.dateRange?.to) {
        const tradeDate = startOfDay(entryDate)
        
        // Filter from date (keep all trades from this date forward)
        if (params.dateRange?.from) {
          const fromDate = startOfDay(new Date(params.dateRange.from))
          if (entryDate < fromDate) {
            return false
          }
        }
        
        // Filter to date (keep all trades up to this date)
        if (params.dateRange?.to) {
          const toDate = endOfDay(new Date(params.dateRange.to))
          if (entryDate > toDate) {
            return false
          }
        }
        
        // If both are set and it's a single day, ensure exact match
        if (params.dateRange?.from && params.dateRange?.to) {
          const fromDate = startOfDay(new Date(params.dateRange.from))
          const toDate = endOfDay(new Date(params.dateRange.to))
          if (fromDate.getTime() === startOfDay(toDate).getTime()) {
            // Single day selection - already handled above, but ensure exact match
            if (tradeDate.getTime() !== fromDate.getTime()) {
              return false
            }
          }
        }
      }

      // PnL range filter
      if ((params.pnlRange.min !== undefined && trade.pnl < params.pnlRange.min) ||
        (params.pnlRange.max !== undefined && trade.pnl > params.pnlRange.max)) {
        return false
      }

      // Time range filter
      if (params.timeRange.range && getTimeRangeKey(trade.timeInPosition) !== params.timeRange.range) {
        return false
      }

      // Weekday filter
      if (params.weekdayFilter?.days && params.weekdayFilter.days.length > 0) {
        const dayOfWeek = entryDate.getDay()
        if (!params.weekdayFilter.days.includes(dayOfWeek)) {
          return false
        }
      }

      // Hour filter
      if (params.hourFilter?.hour !== null) {
        const hour = entryDate.getHours()
        if (hour !== params.hourFilter.hour) {
          return false
        }
      }

      // Tag filter
      if (params.tagFilter.tags.length > 0) {
        if (!trade.tags.some(tag => params.tagFilter.tags.includes(tag))) {
          return false
        }
      }

      return true
    }).sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime())

    if (!filteredTrades.length) {
      return {
        chartData: [],
        accountNumbers: [],
        dateRange: { startDate: '', endDate: '' }
      }
    }

    // Get unique account numbers from filtered trades (for selector)
    const allAccountNumbers = Array.from(new Set(filteredTrades.map(trade => trade.accountNumber)))

    // Respect selection for chart data, but keep full list for the selector
    const hasAccountSelection = params.selectedAccounts.length > 0
    const chartAccountNumbers = hasAccountSelection
      ? allAccountNumbers.filter(acc => params.selectedAccounts.includes(acc))
      : allAccountNumbers

    const limitedAccountNumbers = params.showIndividual 
      ? chartAccountNumbers.slice(0, params.maxAccounts)
      : chartAccountNumbers
    
    // Create account map for quick lookup
    const accountMap = new Map(accounts.map(acc => [acc.number, acc]))
    
    // Filter trades based on reset dates and selected accounts
    const finalFilteredTrades = filteredTrades.filter(trade => {
      const isWhitelistedAccount = limitedAccountNumbers.includes(trade.accountNumber)
    
      if (!isWhitelistedAccount) {
        return false
      }
      
      const account = accountMap.get(trade.accountNumber)
      if (!account) return true // Include if account not found
      
      // Filter based on reset date if it exists
      if (account.resetDate) {
        return new Date(trade.entryDate) >= new Date(account.resetDate)
      }
      
      return true
    })

    if (!finalFilteredTrades.length) {
      return {
        chartData: [],
        accountNumbers: allAccountNumbers,
        dateRange: { startDate: '', endDate: '' }
      }
    }

    // Calculate date boundaries using only the trades that will be displayed
    const dates = finalFilteredTrades.map(t => formatInTimeZone(new Date(t.entryDate), params.timezone, 'yyyy-MM-dd'))
    const startDate = dates.reduce((min, date) => date < min ? date : min)
    const endDate = dates.reduce((max, date) => date > max ? date : max)
    
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    end.setDate(end.getDate() + 1)
    
    const allDates = eachDayOfInterval({ start, end })
    
    // Data sampling for very large datasets
    const datesToProcess = params.dataSampling === 'sample' && allDates.length > 100
      ? allDates.filter((_, index) => index % 2 === 0) // Sample every other point
      : allDates

    // Pre-process trades by date for faster lookup
    const tradesMap = new Map<string, any[]>()
    
    finalFilteredTrades.forEach(trade => {
      const dateKey = formatInTimeZone(new Date(trade.entryDate), params.timezone, 'yyyy-MM-dd')
      if (!tradesMap.has(dateKey)) {
        tradesMap.set(dateKey, [])
      }
      tradesMap.get(dateKey)!.push(trade)
    })

    // Create combined events array with trades, payouts, and resets
    const allEvents: ChartEvent[] = []
    
    // Add trades
    finalFilteredTrades.forEach(trade => {
      allEvents.push({
        date: new Date(trade.entryDate),
        amount: trade.pnl - (trade.commission || 0),
        isPayout: false,
        isReset: false,
        accountNumber: trade.accountNumber
      })
    })
    
    // Add payouts and resets
    limitedAccountNumbers.forEach(accountNumber => {
      const account = accountMap.get(accountNumber)
      if (!account) return
      
      // Add payouts
      account.payouts?.forEach((payout: PrismaPayout) => {
        allEvents.push({
          date: new Date(payout.date),
          amount: ['PENDING', 'VALIDATED', 'PAID'].includes(payout.status) ? -payout.amount : 0,
          isPayout: true,
          isReset: false,
          payoutStatus: payout.status,
          accountNumber: accountNumber
        })
      })
      
      // Add reset if exists
      if (account.resetDate) {
        allEvents.push({
          date: new Date(account.resetDate),
          amount: 0, // Reset doesn't change balance directly
          isPayout: false,
          isReset: true,
          accountNumber: accountNumber
        })
      }
    })
    
    // Sort events by date
    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Use arrays instead of Maps for better performance with small datasets
    const accountEquities: Record<string, number> = {}
    const accountStartingBalances: Record<string, number> = {}
    const accountFirstActivity: Record<string, string | null> = {}
    
    limitedAccountNumbers.forEach(acc => {
      const account = accountMap.get(acc)
      accountEquities[acc] = 0
      accountStartingBalances[acc] = account?.startingBalance || 0
      accountFirstActivity[acc] = null
    })

    const chartData: ChartDataPoint[] = []

    datesToProcess.forEach(date => {
      const dateKey = formatInTimeZone(date, params.timezone, 'yyyy-MM-dd')
      const relevantTrades = tradesMap.get(dateKey) || []
      
      let totalEquity = 0
      const point: ChartDataPoint = { 
        date: dateKey,
        equity: 0 
      }

      if (params.showIndividual) {
        limitedAccountNumbers.forEach(acc => {
          point[`equity_${acc}`] = undefined
          point[`payout_${acc}`] = false
          point[`reset_${acc}`] = false
          point[`payoutStatus_${acc}`] = ''
          point[`payoutAmount_${acc}`] = 0
        })
      }

      // Process events for this date
      const dateEvents = allEvents.filter(event => 
        formatInTimeZone(event.date, params.timezone, 'yyyy-MM-dd') === dateKey
      )

      // Process each account
      for (const accountNumber of limitedAccountNumbers) {
        if (hasAccountSelection && !params.selectedAccounts.includes(accountNumber)) continue

        const account = accountMap.get(accountNumber)
        const accountEvents = dateEvents.filter(event => event.accountNumber === accountNumber)
        
        // Process account events
        accountEvents.forEach(event => {
          if (event.isReset) {
            // Reset the balance to 0
            accountEquities[accountNumber] = 0
            point[`reset_${accountNumber}`] = true
            // Mark first activity if not already set
            if (!accountFirstActivity[accountNumber]) {
              accountFirstActivity[accountNumber] = dateKey
            }
          } else {
            // Add the event amount to equity
            accountEquities[accountNumber] += event.amount
            
            // Mark first activity if not already set
            if (!accountFirstActivity[accountNumber]) {
              accountFirstActivity[accountNumber] = dateKey
            }
            
            if (event.isPayout) {
              point[`payout_${accountNumber}`] = true
              point[`payoutStatus_${accountNumber}`] = event.payoutStatus || ''
              point[`payoutAmount_${accountNumber}`] = -event.amount
            }
          }
        })

        if (params.showIndividual) {
          // Only show equity if account has had activity
          if (accountFirstActivity[accountNumber] && accountFirstActivity[accountNumber] <= dateKey) {
            point[`equity_${accountNumber}`] = accountEquities[accountNumber]
          } else {
            // Set to undefined to not show the line
            point[`equity_${accountNumber}`] = undefined
          }
        }
        totalEquity += accountEquities[accountNumber]
      }

      if (!params.showIndividual) {
        point.equity = totalEquity
      }

      chartData.push(point)
    })

    console.log('AccountNumber', limitedAccountNumbers)
    return {
      chartData,
      accountNumbers: allAccountNumbers,
      dateRange: { startDate, endDate }
    }

  } catch (error) {
    console.error('[getEquityChartData] Error:', error)
    throw new Error('Failed to fetch equity chart data')
  }
}

// Helper function for time range filtering (copied from utils)
function getTimeRangeKey(timeInPosition: number): string {
  if (timeInPosition < 60) return 'under-1min'
  if (timeInPosition < 300) return '1-5min'
  if (timeInPosition < 900) return '5-15min'
  if (timeInPosition < 1800) return '15-30min'
  if (timeInPosition < 3600) return '30-60min'
  if (timeInPosition < 7200) return '1-2h'
  if (timeInPosition < 14400) return '2-4h'
  if (timeInPosition < 28800) return '4-8h'
  if (timeInPosition < 86400) return '8-24h'
  return 'over-24h'
}
