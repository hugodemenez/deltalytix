import { getTradesAction } from "@/server/database";
import { getGroupsAction } from "@/server/groups";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { groups } from "d3";
import { z } from 'zod/v3';

// Define Zod schemas first
const AccountMetricsSchema = z.object({
  accountNumber: z.string(),
  totalTrades: z.number(),
  winningTrades: z.number(),
  losingTrades: z.number(),
  winRate: z.number(),
  totalPnL: z.number(),
  totalCommission: z.number(),
  netPnL: z.number(),
  averageWin: z.number(),
  averageLoss: z.number(),
  profitFactor: z.number(),
  largestWin: z.number(),
  largestLoss: z.number(),
  averageTradeSize: z.number(),
  totalVolume: z.number(),
  maxDrawdown: z.number(),
  sharpeRatio: z.number(),
  instruments: z.array(z.string()),
  mostTradedInstrument: z.string(),
  accountUtilization: z.number(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  consistency: z.number(),
  avgDailyVolume: z.number(),
  profitability: z.enum(['highly_profitable', 'profitable', 'break_even', 'unprofitable'])
});

const AccountAnalysisSchema = z.object({
  accounts: z.array(AccountMetricsSchema),
  totalPortfolioValue: z.number()
});

// Infer TypeScript types from Zod schemas
export type AccountMetrics = z.infer<typeof AccountMetricsSchema>;
export type AccountAnalysis = z.infer<typeof AccountAnalysisSchema>;

// Export schemas for reuse
export { AccountMetricsSchema, AccountAnalysisSchema };

function calculateAccountMetrics(accountNumber: string, trades: Trade[], allTrades: Trade[]): AccountMetrics {
  const accountTrades = trades.filter(t => t.accountNumber === accountNumber);
  
  if (accountTrades.length === 0) {
    return {
      accountNumber,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      totalCommission: 0,
      netPnL: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0,
      averageTradeSize: 0,
      totalVolume: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      instruments: [],
      mostTradedInstrument: '',
      accountUtilization: 0,
      riskLevel: 'low',
      consistency: 0,
      avgDailyVolume: 0,
      profitability: 'break_even'
    };
  }
  
  const totalTrades = accountTrades.length;
  const winningTrades = accountTrades.filter(t => t.pnl > 0).length;
  const losingTrades = accountTrades.filter(t => t.pnl < 0).length;
  const winRate = (winningTrades / totalTrades) * 100;
  
  const totalPnL = accountTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalCommission = accountTrades.reduce((sum, t) => sum + t.commission, 0);
  const netPnL = totalPnL - totalCommission;
  
  const wins = accountTrades.filter(t => t.pnl > 0);
  const losses = accountTrades.filter(t => t.pnl < 0);
  
  const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
  
  const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;
  
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;
  
  const averageTradeSize = accountTrades.reduce((sum, t) => sum + t.quantity, 0) / totalTrades;
  const totalVolume = accountTrades.reduce((sum, t) => sum + t.quantity, 0);
  
  // Calculate max drawdown
  let runningPnL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  
  for (const trade of accountTrades) {
    runningPnL += trade.pnl - trade.commission;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // Calculate Sharpe ratio
  const returns = accountTrades.map(t => t.pnl - t.commission);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Get instruments and most traded
  const instruments = [...new Set(accountTrades.map(t => t.instrument))];
  const instrumentCounts = accountTrades.reduce((counts, trade) => {
    counts[trade.instrument] = (counts[trade.instrument] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const mostTradedInstrument = Object.entries(instrumentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  
  // Calculate account utilization (percentage of total portfolio volume)
  const totalPortfolioVolume = allTrades.reduce((sum, t) => sum + t.quantity, 0);
  const accountUtilization = totalPortfolioVolume > 0 ? (totalVolume / totalPortfolioVolume) * 100 : 0;
  
  // Determine risk level based on drawdown and volatility
  let riskLevel: 'low' | 'medium' | 'high';
  if (maxDrawdown > 2000 || stdDev > 500) {
    riskLevel = 'high';
  } else if (maxDrawdown > 1000 || stdDev > 200) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // Calculate consistency (percentage of profitable weeks)
  const weeklyGroups = accountTrades.reduce((groups, trade) => {
    const date = new Date(trade.entryDate);
    const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
    if (!groups[weekKey]) groups[weekKey] = [];
    groups[weekKey].push(trade);
    return groups;
  }, {} as Record<string, Trade[]>);
  
  const profitableWeeks = Object.values(weeklyGroups).filter(weekTrades => 
    weekTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0) > 0
  ).length;
  
  const consistency = Object.keys(weeklyGroups).length > 0 ? (profitableWeeks / Object.keys(weeklyGroups).length) * 100 : 0;
  
  // Calculate average daily volume
  const dailyGroups = accountTrades.reduce((groups, trade) => {
    const date = new Date(trade.entryDate).toISOString().split('T')[0];
    if (!groups[date]) groups[date] = 0;
    groups[date] += trade.quantity;
    return groups;
  }, {} as Record<string, number>);
  
  const avgDailyVolume = Object.keys(dailyGroups).length > 0 ? 
    Object.values(dailyGroups).reduce((sum, vol) => sum + vol, 0) / Object.keys(dailyGroups).length : 0;
  
  // Determine profitability level
  let profitability: 'highly_profitable' | 'profitable' | 'break_even' | 'unprofitable';
  if (netPnL > 2000) profitability = 'highly_profitable';
  else if (netPnL > 0) profitability = 'profitable';
  else if (netPnL >= -200) profitability = 'break_even';
  else profitability = 'unprofitable';
  
  return {
    accountNumber,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Math.round(winRate * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    netPnL: Math.round(netPnL * 100) / 100,
    averageWin: Math.round(averageWin * 100) / 100,
    averageLoss: Math.round(averageLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    averageTradeSize: Math.round(averageTradeSize),
    totalVolume: Math.round(totalVolume),
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    instruments,
    mostTradedInstrument,
    accountUtilization: Math.round(accountUtilization * 100) / 100,
    riskLevel,
    consistency: Math.round(consistency * 100) / 100,
    avgDailyVolume: Math.round(avgDailyVolume),
    profitability
  };
}

function analyzeAccounts(trades: Trade[]): AccountAnalysis {
  if (!trades || trades.length === 0) {
    return {
      accounts: [],
      totalPortfolioValue: 0
    };
  }
  
  const uniqueAccounts = [...new Set(trades.map(t => t.accountNumber))];
  const accounts = uniqueAccounts.map(accountNumber => 
    calculateAccountMetrics(accountNumber, trades, trades)
  ).filter(account => account.totalTrades > 0);
  
  // Calculate total portfolio value
  const totalPortfolioValue = accounts.reduce((sum, account) => sum + account.netPnL, 0);
  
  return {
    accounts: accounts.sort((a, b) => b.netPnL - a.netPnL),
    totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100
  };
}

export const getAccountPerformance = tool({
  description: 'Get account performance data and total portfolio value for AI analysis',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Optional start date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    endDate: z.string().optional().describe('Optional end date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    minTrades: z.number().optional().describe('Minimum number of trades required to include an account in analysis')
  }),
  execute: async ({ startDate, endDate, minTrades = 1 }: { startDate?: string, endDate?: string, minTrades?: number }) => {
    console.log(`[getAccountPerformance] startDate: ${startDate}, endDate: ${endDate}, minTrades: ${minTrades}`);
    
    let trades = await getTradesAction();
    
    // Filter trades by date range if provided
    if (startDate || endDate) {
      trades = trades.filter(trade => {
        const tradeDate = new Date(trade.entryDate);
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date('2100-01-01');
        return tradeDate >= start && tradeDate <= end;
      });
    }

    const groups = await getGroupsAction();
    const hiddenGroup = groups.find(g => g.name === "Hidden Accounts")
    const hiddenAccountNumbers = hiddenGroup ? new Set(hiddenGroup.accounts.map(a => a.number)) : new Set()
    // Filter out hidden accounts
    trades = trades.filter(trade => !hiddenAccountNumbers.has(trade.accountNumber));
    
    const analysis = analyzeAccounts(trades);
    
    // Filter out accounts with fewer than minTrades
    analysis.accounts = analysis.accounts.filter(account => account.totalTrades >= minTrades);
    
    return analysis;
  }
}); 