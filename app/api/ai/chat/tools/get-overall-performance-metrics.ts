import { getTradesAction } from "@/server/database";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';

interface OverallMetrics {
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
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalVolume: number;
}

function calculateOverallMetrics(trades: Trade[]): OverallMetrics {
  if (!trades || trades.length === 0) {
    return {
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
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      totalVolume: 0
    };
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);
  const netPnL = totalPnL - totalCommission;
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
  
  const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;
  
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;
  
  const averageTradeSize = trades.reduce((sum, t) => sum + t.quantity, 0) / totalTrades;
  const totalVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
  
  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  
  for (const trade of trades) {
    if (trade.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
    } else if (trade.pnl < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    }
  }
  
  // Calculate max drawdown
  let runningPnL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  
  for (const trade of trades) {
    runningPnL += trade.pnl - trade.commission;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // Simple Sharpe ratio calculation (assuming risk-free rate of 0)
  const dailyReturns = trades.map(t => t.pnl - t.commission);
  const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length);
  const sharpeRatio = stdDev > 0 ? avgDailyReturn / stdDev : 0;
  
  return {
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
    maxConsecutiveWins,
    maxConsecutiveLosses,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    totalVolume: Math.round(totalVolume)
  };
}

export const getOverallPerformanceMetrics = tool({
  description: 'Get comprehensive overall performance metrics including win rate, profit factor, risk metrics, and trading statistics',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Optional start date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    endDate: z.string().optional().describe('Optional end date to filter trades (format: 2025-01-14T14:33:01.000Z)')
  }),
  execute: async ({ startDate, endDate }: { startDate?: string, endDate?: string }) => {
    console.log(`[getOverallPerformanceMetrics] startDate: ${startDate}, endDate: ${endDate}`);
    
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
    
    return calculateOverallMetrics(trades);
  }
}); 