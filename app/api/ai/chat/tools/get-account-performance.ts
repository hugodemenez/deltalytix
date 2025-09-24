import { getTradesAction } from "@/server/database";
import { Trade } from "@prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';

interface AccountMetrics {
  accountNumber: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalCommission: number;
  netPnL: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  averageTradeSize: number;
  totalVolume: number;
  maxDrawdown: number;
  sharpeRatio: number;
  instruments: string[];
  mostTradedInstrument: string;
  accountUtilization: number; // Percentage of total trading volume
  riskLevel: 'low' | 'medium' | 'high';
  consistency: number;
  avgDailyVolume: number;
  profitability: 'highly_profitable' | 'profitable' | 'break_even' | 'unprofitable';
}

interface AccountAnalysis {
  accounts: AccountMetrics[];
  bestPerformingAccount: AccountMetrics | null;
  worstPerformingAccount: AccountMetrics | null;
  largestAccount: AccountMetrics | null;
  mostActiveAccount: AccountMetrics | null;
  mostConsistentAccount: AccountMetrics | null;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  recommendations: string[];
  totalPortfolioValue: number;
  portfolioRisk: 'diversified' | 'concentrated' | 'high_risk';
}

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
      bestPerformingAccount: null,
      worstPerformingAccount: null,
      largestAccount: null,
      mostActiveAccount: null,
      mostConsistentAccount: null,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      recommendations: [],
      totalPortfolioValue: 0,
      portfolioRisk: 'diversified'
    };
  }
  
  const uniqueAccounts = [...new Set(trades.map(t => t.accountNumber))];
  const accounts = uniqueAccounts.map(accountNumber => 
    calculateAccountMetrics(accountNumber, trades, trades)
  ).filter(account => account.totalTrades > 0);
  
  // Find best and worst performing accounts
  const bestPerformingAccount = accounts.length > 0 ? accounts.reduce((best, current) => 
    current.netPnL > best.netPnL ? current : best
  ) : null;
  
  const worstPerformingAccount = accounts.length > 0 ? accounts.reduce((worst, current) => 
    current.netPnL < worst.netPnL ? current : worst
  ) : null;
  
  const largestAccount = accounts.length > 0 ? accounts.reduce((largest, current) => 
    current.totalVolume > largest.totalVolume ? current : largest
  ) : null;
  
  const mostActiveAccount = accounts.length > 0 ? accounts.reduce((active, current) => 
    current.totalTrades > active.totalTrades ? current : active
  ) : null;
  
  const mostConsistentAccount = accounts.length > 0 ? accounts.reduce((consistent, current) => 
    current.consistency > consistent.consistency ? current : consistent
  ) : null;
  
  // Calculate risk distribution
  const riskDistribution = accounts.reduce((dist, account) => {
    dist[account.riskLevel]++;
    return dist;
  }, { low: 0, medium: 0, high: 0 });
  
  // Calculate total portfolio value
  const totalPortfolioValue = accounts.reduce((sum, account) => sum + account.netPnL, 0);
  
  // Determine portfolio risk level
  let portfolioRisk: 'diversified' | 'concentrated' | 'high_risk';
  const highRiskAccounts = riskDistribution.high;
  const totalAccounts = accounts.length;
  
  if (highRiskAccounts / totalAccounts > 0.5) {
    portfolioRisk = 'high_risk';
  } else if (totalAccounts < 3 || accounts.some(a => a.accountUtilization > 60)) {
    portfolioRisk = 'concentrated';
  } else {
    portfolioRisk = 'diversified';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (bestPerformingAccount) {
    recommendations.push(`Account ${bestPerformingAccount.accountNumber} is your best performer (${bestPerformingAccount.netPnL.toFixed(2)} net PnL) - consider increasing allocation`);
  }
  
  if (worstPerformingAccount && worstPerformingAccount.netPnL < -500) {
    recommendations.push(`Account ${worstPerformingAccount.accountNumber} shows poor performance (${worstPerformingAccount.netPnL.toFixed(2)} net PnL) - review strategy or reduce exposure`);
  }
  
  if (portfolioRisk === 'high_risk') {
    recommendations.push('High portfolio risk detected - consider reducing position sizes or implementing stricter risk management');
  }
  
  if (portfolioRisk === 'concentrated') {
    recommendations.push('Portfolio appears concentrated - consider diversifying across more accounts or instruments');
  }
  
  if (mostConsistentAccount && mostConsistentAccount.consistency > 70) {
    recommendations.push(`Account ${mostConsistentAccount.accountNumber} shows high consistency (${mostConsistentAccount.consistency.toFixed(1)}%) - consider it as core allocation`);
  }
  
  const unprofitableAccounts = accounts.filter(a => a.netPnL < 0);
  if (unprofitableAccounts.length > accounts.length / 2) {
    recommendations.push('More than half of your accounts are unprofitable - consider consolidating or reviewing overall strategy');
  }
  
  return {
    accounts: accounts.sort((a, b) => b.netPnL - a.netPnL),
    bestPerformingAccount,
    worstPerformingAccount,
    largestAccount,
    mostActiveAccount,
    mostConsistentAccount,
    riskDistribution,
    recommendations,
    totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
    portfolioRisk
  };
}

export const getAccountPerformance = tool({
  description: 'Get detailed performance analysis and comparison across different trading accounts including risk distribution and portfolio optimization recommendations',
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
    
    const analysis = analyzeAccounts(trades);
    
    // Filter out accounts with fewer than minTrades
    analysis.accounts = analysis.accounts.filter(account => account.totalTrades >= minTrades);
    
    return analysis;
  }
}); 