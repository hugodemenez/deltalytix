import { getTradesAction } from "@/server/database";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';

interface PerformanceTrend {
  period: string;
  netPnL: number;
  tradeCount: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
}

interface TrendAnalysis {
  monthly: PerformanceTrend[];
  weekly: PerformanceTrend[];
  daily: PerformanceTrend[];
  bestMonth: PerformanceTrend | null;
  worstMonth: PerformanceTrend | null;
  bestWeek: PerformanceTrend | null;
  worstWeek: PerformanceTrend | null;
  consistency: number; // Percentage of profitable periods
  overallTrend: 'improving' | 'declining' | 'stable';
}

function calculatePeriodMetrics(trades: Trade[]): PerformanceTrend | null {
  if (!trades || trades.length === 0) return null;
  
  const netPnL = trades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
  const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;
  
  return {
    period: '',
    netPnL: Math.round(netPnL * 100) / 100,
    tradeCount: trades.length,
    winRate: Math.round(winRate * 100) / 100,
    averageWin: Math.round(averageWin * 100) / 100,
    averageLoss: Math.round(averageLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100
  };
}

function getWeekNumber(date: Date): number {
  const onejan = new Date(date.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  return Math.ceil((((date.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
}

function analyzeTrends(trades: Trade[]): TrendAnalysis {
  if (!trades || trades.length === 0) {
    return {
      monthly: [],
      weekly: [],
      daily: [],
      bestMonth: null,
      worstMonth: null,
      bestWeek: null,
      worstWeek: null,
      consistency: 0,
      overallTrend: 'stable'
    };
  }
  
  // Group trades by month
  const monthlyGroups = trades.reduce((groups, trade) => {
    const date = new Date(trade.entryDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(trade);
    return groups;
  }, {} as Record<string, Trade[]>);
  
  // Group trades by week
  const weeklyGroups = trades.reduce((groups, trade) => {
    const date = new Date(trade.entryDate);
    const weekKey = `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
    if (!groups[weekKey]) groups[weekKey] = [];
    groups[weekKey].push(trade);
    return groups;
  }, {} as Record<string, Trade[]>);
  
  // Group trades by day
  const dailyGroups = trades.reduce((groups, trade) => {
    const date = new Date(trade.entryDate);
    const dayKey = date.toISOString().split('T')[0];
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(trade);
    return groups;
  }, {} as Record<string, Trade[]>);
  
  // Calculate monthly trends
  const monthly = Object.entries(monthlyGroups)
    .map(([period, trades]) => {
      const metrics = calculatePeriodMetrics(trades);
      return metrics ? { ...metrics, period } : null;
    })
    .filter(m => m !== null)
    .sort((a, b) => a.period.localeCompare(b.period));
  
  // Calculate weekly trends
  const weekly = Object.entries(weeklyGroups)
    .map(([period, trades]) => {
      const metrics = calculatePeriodMetrics(trades);
      return metrics ? { ...metrics, period } : null;
    })
    .filter(m => m !== null)
    .sort((a, b) => a.period.localeCompare(b.period));
  
  // Calculate daily trends (last 30 days only)
  const daily = Object.entries(dailyGroups)
    .map(([period, trades]) => {
      const metrics = calculatePeriodMetrics(trades);
      return metrics ? { ...metrics, period } : null;
    })
    .filter(m => m !== null)
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 30);
  
  // Find best and worst periods
  const bestMonth = monthly.length > 0 ? monthly.reduce((best, current) => 
    current.netPnL > best.netPnL ? current : best
  ) : null;
  
  const worstMonth = monthly.length > 0 ? monthly.reduce((worst, current) => 
    current.netPnL < worst.netPnL ? current : worst
  ) : null;
  
  const bestWeek = weekly.length > 0 ? weekly.reduce((best, current) => 
    current.netPnL > best.netPnL ? current : best
  ) : null;
  
  const worstWeek = weekly.length > 0 ? weekly.reduce((worst, current) => 
    current.netPnL < worst.netPnL ? current : worst
  ) : null;
  
  // Calculate consistency (percentage of profitable periods)
  const profitableMonths = monthly.filter(m => m.netPnL > 0).length;
  const consistency = monthly.length > 0 ? (profitableMonths / monthly.length) * 100 : 0;
  
  // Determine overall trend
  let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (monthly.length >= 3) {
    const recentMonths = monthly.slice(-3);
    const earlierMonths = monthly.slice(-6, -3);
    
    if (recentMonths.length >= 2 && earlierMonths.length >= 2) {
      const recentAvg = recentMonths.reduce((sum, m) => sum + m.netPnL, 0) / recentMonths.length;
      const earlierAvg = earlierMonths.reduce((sum, m) => sum + m.netPnL, 0) / earlierMonths.length;
      
      if (recentAvg > earlierAvg * 1.1) {
        overallTrend = 'improving';
      } else if (recentAvg < earlierAvg * 0.9) {
        overallTrend = 'declining';
      }
    }
  }
  
  return {
    monthly,
    weekly,
    daily: daily.reverse(), // Show chronological order
    bestMonth,
    worstMonth,
    bestWeek,
    worstWeek,
    consistency: Math.round(consistency * 100) / 100,
    overallTrend
  };
}

export const getPerformanceTrends = tool({
  description: 'Get performance trends and patterns over time including monthly, weekly, and daily breakdowns',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Optional start date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    endDate: z.string().optional().describe('Optional end date to filter trades (format: 2025-01-14T14:33:01.000Z)')
  }),
  execute: async ({ startDate, endDate }: { startDate?: string, endDate?: string }) => {
    console.log(`[getPerformanceTrends] startDate: ${startDate}, endDate: ${endDate}`);
    
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
    
    return analyzeTrends(trades);
  }
}); 