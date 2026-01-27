import { getTradesAction } from "@/server/database";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';

interface InstrumentMetrics {
  instrument: string;
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
  avgHoldingTime: number; // in minutes
  longTrades: number;
  shortTrades: number;
  longWinRate: number;
  shortWinRate: number;
  profitability: 'highly_profitable' | 'profitable' | 'break_even' | 'unprofitable';
  consistency: number; // Percentage of profitable periods
}

interface InstrumentAnalysis {
  instruments: InstrumentMetrics[];
  bestPerformer: InstrumentMetrics | null;
  worstPerformer: InstrumentMetrics | null;
  mostTraded: InstrumentMetrics | null;
  riskiestInstrument: InstrumentMetrics | null;
  mostConsistent: InstrumentMetrics | null;
  recommendations: string[];
}

function calculateInstrumentMetrics(instrument: string, trades: Trade[]): InstrumentMetrics {
  const instrumentTrades = trades.filter(t => t.instrument === instrument);
  
  if (instrumentTrades.length === 0) {
    return {
      instrument,
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
      avgHoldingTime: 0,
      longTrades: 0,
      shortTrades: 0,
      longWinRate: 0,
      shortWinRate: 0,
      profitability: 'break_even',
      consistency: 0
    };
  }
  
  const totalTrades = instrumentTrades.length;
  const winningTrades = instrumentTrades.filter(t => t.pnl > 0).length;
  const losingTrades = instrumentTrades.filter(t => t.pnl < 0).length;
  const winRate = (winningTrades / totalTrades) * 100;
  
  const totalPnL = instrumentTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalCommission = instrumentTrades.reduce((sum, t) => sum + t.commission, 0);
  const netPnL = totalPnL - totalCommission;
  
  const wins = instrumentTrades.filter(t => t.pnl > 0);
  const losses = instrumentTrades.filter(t => t.pnl < 0);
  
  const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
  
  const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;
  
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;
  
  const averageTradeSize = instrumentTrades.reduce((sum, t) => sum + t.quantity, 0) / totalTrades;
  const totalVolume = instrumentTrades.reduce((sum, t) => sum + t.quantity, 0);
  
  // Calculate max drawdown
  let runningPnL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  
  for (const trade of instrumentTrades) {
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
  const returns = instrumentTrades.map(t => t.pnl - t.commission);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Calculate average holding time (using entryDate and closeDate)
  const avgHoldingTime = instrumentTrades.reduce((sum, t) => {
    if (t.closeDate) {
      const holdingTime = (new Date(t.closeDate).getTime() - new Date(t.entryDate).getTime()) / (1000 * 60);
      return sum + holdingTime;
    }
    return sum;
  }, 0) / instrumentTrades.length;
  
  // Long vs Short analysis
  const longTrades = instrumentTrades.filter(t => t.side?.toLowerCase() === 'long').length;
  const shortTrades = instrumentTrades.filter(t => t.side?.toLowerCase() === 'short').length;
  
  const longWinningTrades = instrumentTrades.filter(t => t.side?.toLowerCase() === 'long' && t.pnl > 0).length;
  const shortWinningTrades = instrumentTrades.filter(t => t.side?.toLowerCase() === 'short' && t.pnl > 0).length;
  
  const longWinRate = longTrades > 0 ? (longWinningTrades / longTrades) * 100 : 0;
  const shortWinRate = shortTrades > 0 ? (shortWinningTrades / shortTrades) * 100 : 0;
  
  // Determine profitability level
  let profitability: 'highly_profitable' | 'profitable' | 'break_even' | 'unprofitable';
  if (netPnL > 1000) profitability = 'highly_profitable';
  else if (netPnL > 0) profitability = 'profitable';
  else if (netPnL >= -100) profitability = 'break_even';
  else profitability = 'unprofitable';
  
  // Calculate consistency (percentage of profitable weeks)
  const weeklyGroups = instrumentTrades.reduce((groups, trade) => {
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
  
  return {
    instrument,
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
    avgHoldingTime: Math.round(avgHoldingTime),
    longTrades,
    shortTrades,
    longWinRate: Math.round(longWinRate * 100) / 100,
    shortWinRate: Math.round(shortWinRate * 100) / 100,
    profitability,
    consistency: Math.round(consistency * 100) / 100
  };
}

function analyzeInstruments(trades: Trade[]): InstrumentAnalysis {
  if (!trades || trades.length === 0) {
    return {
      instruments: [],
      bestPerformer: null,
      worstPerformer: null,
      mostTraded: null,
      riskiestInstrument: null,
      mostConsistent: null,
      recommendations: []
    };
  }
  
  const uniqueInstruments = [...new Set(trades.map(t => t.instrument))];
  const instruments = uniqueInstruments.map(instrument => 
    calculateInstrumentMetrics(instrument, trades)
  ).filter(metrics => metrics.totalTrades > 0);
  
  // Sort by various metrics
  const bestPerformer = instruments.length > 0 ? instruments.reduce((best, current) => 
    current.netPnL > best.netPnL ? current : best
  ) : null;
  
  const worstPerformer = instruments.length > 0 ? instruments.reduce((worst, current) => 
    current.netPnL < worst.netPnL ? current : worst
  ) : null;
  
  const mostTraded = instruments.length > 0 ? instruments.reduce((most, current) => 
    current.totalTrades > most.totalTrades ? current : most
  ) : null;
  
  const riskiestInstrument = instruments.length > 0 ? instruments.reduce((riskiest, current) => 
    current.maxDrawdown > riskiest.maxDrawdown ? current : riskiest
  ) : null;
  
  const mostConsistent = instruments.length > 0 ? instruments.reduce((consistent, current) => 
    current.consistency > consistent.consistency ? current : consistent
  ) : null;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (bestPerformer) {
    recommendations.push(`Consider increasing position size or frequency for ${bestPerformer.instrument} (${bestPerformer.netPnL.toFixed(2)} net PnL)`);
  }
  
  if (worstPerformer && worstPerformer.netPnL < -100) {
    recommendations.push(`Consider reducing exposure to ${worstPerformer.instrument} (${worstPerformer.netPnL.toFixed(2)} net PnL)`);
  }
  
  if (mostConsistent && mostConsistent.consistency > 70) {
    recommendations.push(`${mostConsistent.instrument} shows high consistency (${mostConsistent.consistency.toFixed(1)}%) - consider as core holding`);
  }
  
  if (riskiestInstrument && riskiestInstrument.maxDrawdown > 1000) {
    recommendations.push(`${riskiestInstrument.instrument} has high drawdown (${riskiestInstrument.maxDrawdown.toFixed(2)}) - review risk management`);
  }
  
  return {
    instruments: instruments.sort((a, b) => b.netPnL - a.netPnL),
    bestPerformer,
    worstPerformer,
    mostTraded,
    riskiestInstrument,
    mostConsistent,
    recommendations
  };
}

export const getInstrumentPerformance = tool({
  description: 'Get detailed performance analysis for each trading instrument including profitability, risk metrics, and trading patterns',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Optional start date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    endDate: z.string().optional().describe('Optional end date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    minTrades: z.number().optional().describe('Minimum number of trades required to include an instrument in analysis')
  }),
  execute: async ({ startDate, endDate, minTrades = 1 }: { startDate?: string, endDate?: string, minTrades?: number }) => {
    console.log(`[getInstrumentPerformance] startDate: ${startDate}, endDate: ${endDate}, minTrades: ${minTrades}`);
    
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
    
    const analysis = analyzeInstruments(trades);
    
    // Filter out instruments with fewer than minTrades
    analysis.instruments = analysis.instruments.filter(instrument => instrument.totalTrades >= minTrades);
    
    return analysis;
  }
}); 