import { getTradesAction } from "@/server/database";
import { tool } from "ai";
import { z } from 'zod/v3';
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface ChartDataPoint {
  date: string
  [key: `equity_${string}`]: number | undefined
  equity?: number
  dailyPnL?: number | undefined
  dailyCommissions?: number | undefined
  netPnL?: number | undefined
  [key: `payout_${string}`]: boolean
  [key: `reset_${string}`]: boolean
  [key: `payoutStatus_${string}`]: string
  [key: `payoutAmount_${string}`]: number
}

export const generateEquityChart = tool({
  description: 'Generate an equity chart with trading data. Use this when the user asks for charts, visualizations, or equity curves. Can filter by account, date range, and show individual or grouped view.',
  inputSchema: z.object({
    accountNumbers: z.array(z.string()).optional().describe('Array of account numbers to include in the chart. If empty, includes all accounts.'),
    startDate: z.string().optional().describe('Start date in format 2025-01-14T00:00:00.000Z'),
    endDate: z.string().optional().describe('End date in format 2025-01-14T23:59:59.999Z'),
    showIndividual: z.boolean().optional().default(false).describe('Whether to show individual account lines or grouped total'),
    timezone: z.string().optional().default('UTC').describe('Timezone for date calculations'),
    maxAccounts: z.number().optional().default(8).describe('Maximum number of accounts to display in individual view'),
  }),
  execute: async ({ 
    accountNumbers = [], 
    startDate, 
    endDate, 
    showIndividual = false, 
    timezone = 'UTC',
    maxAccounts = 8 
  }) => {
    console.log(`[generateEquityChart] TOOL CALLED - accountNumbers: ${accountNumbers}, startDate: ${startDate}, endDate: ${endDate}, showIndividual: ${showIndividual}, timezone: ${timezone}`)
    
    let trades = await getTradesAction();
    
    // Filter by account numbers if specified
    if (accountNumbers.length > 0) {
      trades = trades.filter(trade => accountNumbers.includes(trade.accountNumber));
    }
    
    // Filter by date range if specified
    if (startDate) {
      trades = trades.filter(trade => trade.entryDate >= startDate);
    }
    if (endDate) {
      trades = trades.filter(trade => trade.entryDate <= endDate);
    }
    
    if (trades.length === 0) {
      return {
        chartData: [],
        accountNumbers: [],
        dateRange: { start: startDate, end: endDate },
        message: 'No trades found for the specified criteria'
      };
    }
    
    // Get all unique account numbers
    const allAccountNumbers = Array.from(new Set(trades.map(trade => trade.accountNumber)));
    const limitedAccountNumbers = showIndividual 
      ? allAccountNumbers.slice(0, maxAccounts)
      : allAccountNumbers;
    
    // Calculate date boundaries
    const dates = trades.map(t => formatInTimeZone(new Date(t.entryDate), timezone, 'yyyy-MM-dd'));
    const startDateStr = dates.reduce((min, date) => date < min ? date : min);
    const endDateStr = dates.reduce((max, date) => date > max ? date : max);
    
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    end.setDate(end.getDate() + 1);
    
    const allDates = eachDayOfInterval({ start, end });
    
    // Pre-process trades by date for faster lookup
    const tradesMap = new Map<string, any[]>();
    
    trades.forEach(trade => {
      const dateKey = formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd');
      if (!tradesMap.has(dateKey)) {
        tradesMap.set(dateKey, []);
      }
      tradesMap.get(dateKey)!.push(trade);
    });
    
    // Initialize account equities
    const accountEquities: Record<string, number> = {};
    const accountStartingBalances: Record<string, number> = {};
    const accountFirstActivity: Record<string, string | null> = {};
    
    limitedAccountNumbers.forEach(acc => {
      accountEquities[acc] = 0;
      accountStartingBalances[acc] = 0; // We'll use 0 as starting balance for now
      accountFirstActivity[acc] = null;
    });
    
    const chartData: ChartDataPoint[] = [];
    
    allDates.forEach(date => {
      const dateKey = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
      const relevantTrades = tradesMap.get(dateKey) || [];
      
      let totalEquity = 0;
      const point: ChartDataPoint = { 
        date: dateKey,
        equity: 0 
      };
      
      if (showIndividual) {
        limitedAccountNumbers.forEach(acc => {
          point[`equity_${acc}`] = undefined;
          point[`payout_${acc}`] = false;
          point[`reset_${acc}`] = false;
          point[`payoutStatus_${acc}`] = '';
          point[`payoutAmount_${acc}`] = 0;
        });
      }
      
      // Process trades for this date
      relevantTrades.forEach(trade => {
        if (limitedAccountNumbers.includes(trade.accountNumber)) {
          const netPnL = trade.pnl - (trade.commission || 0);
          accountEquities[trade.accountNumber] += netPnL;
          
          // Mark first activity if not already set
          if (!accountFirstActivity[trade.accountNumber]) {
            accountFirstActivity[trade.accountNumber] = dateKey;
          }
        }
      });
      
      // Set equity values for each account
      limitedAccountNumbers.forEach(accountNumber => {
        if (showIndividual) {
          // Only show equity if account has had activity
          if (accountFirstActivity[accountNumber] && accountFirstActivity[accountNumber] <= dateKey) {
            point[`equity_${accountNumber}`] = accountEquities[accountNumber];
          } else {
            point[`equity_${accountNumber}`] = undefined;
          }
        }
        totalEquity += accountEquities[accountNumber];
      });
      
      if (!showIndividual) {
        point.equity = totalEquity;
      }
      
      chartData.push(point);
    });
    
    const result = {
      chartData,
      accountNumbers: limitedAccountNumbers,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      },
      showIndividual,
      timezone,
      totalTrades: trades.length,
      message: `Generated equity chart with ${chartData.length} data points for ${limitedAccountNumbers.length} account(s)`
    };
    
    console.log(`[generateEquityChart] RETURNING RESULT:`, JSON.stringify(result, null, 2));
    return result;
  },
})
