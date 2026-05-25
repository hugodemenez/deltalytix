import { getTradesAction } from "@/server/database";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';
import { formatInTimeZone } from "date-fns-tz";

interface TimePerformance {
  period: string;
  totalTrades: number;
  netPnL: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  averageTradeSize: number;
  consistency: number;
}

interface SessionPerformance {
  session: string;
  description: string;
  startHour: number;
  endHour: number;
  totalTrades: number;
  netPnL: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  consistency: number;
}

interface TimeAnalysis {
  hourlyPerformance: TimePerformance[];
  dayOfWeekPerformance: TimePerformance[];
  sessionPerformance: SessionPerformance[];
  bestTradingHour: TimePerformance | null;
  worstTradingHour: TimePerformance | null;
  bestTradingDay: TimePerformance | null;
  worstTradingDay: TimePerformance | null;
  bestSession: SessionPerformance | null;
  worstSession: SessionPerformance | null;
  optimalTradingWindows: string[];
  recommendations: string[];
}

function calculateTimeMetrics(trades: Trade[], timezone: string = 'UTC'): TimePerformance | null {
  if (!trades || trades.length === 0) return null;
  
  const totalTrades = trades.length;
  const netPnL = trades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  const winRate = (wins.length / totalTrades) * 100;
  const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
  const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;
  const averageTradeSize = trades.reduce((sum, t) => sum + t.quantity, 0) / totalTrades;
  
  // Calculate consistency (percentage of profitable days)
  const dailyGroups = trades.reduce((groups, trade) => {
    const date = formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(trade);
    return groups;
  }, {} as Record<string, Trade[]>);
  
  const profitableDays = Object.values(dailyGroups).filter(dayTrades => 
    dayTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0) > 0
  ).length;
  
  const consistency = Object.keys(dailyGroups).length > 0 ? (profitableDays / Object.keys(dailyGroups).length) * 100 : 0;
  
  return {
    period: '',
    totalTrades,
    netPnL: Math.round(netPnL * 100) / 100,
    winRate: Math.round(winRate * 100) / 100,
    averageWin: Math.round(averageWin * 100) / 100,
    averageLoss: Math.round(averageLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    averageTradeSize: Math.round(averageTradeSize),
    consistency: Math.round(consistency * 100) / 100
  };
}

function analyzeTimeOfDay(trades: Trade[], timezone: string = 'UTC'): TimeAnalysis {
  if (!trades || trades.length === 0) {
    return {
      hourlyPerformance: [],
      dayOfWeekPerformance: [],
      sessionPerformance: [],
      bestTradingHour: null,
      worstTradingHour: null,
      bestTradingDay: null,
      worstTradingDay: null,
      bestSession: null,
      worstSession: null,
      optimalTradingWindows: [],
      recommendations: []
    };
  }
  
  // Define trading sessions (these hours are in the user's timezone now)
  const sessions = [
    { session: 'Asian Session', description: 'Asian markets open', startHour: 21, endHour: 6 },
    { session: 'London Session', description: 'European markets open', startHour: 7, endHour: 16 },
    { session: 'New York Session', description: 'US markets open', startHour: 13, endHour: 22 },
    { session: 'Overlap: London/NY', description: 'London and New York overlap', startHour: 13, endHour: 16 }
  ];
  
  // Group trades by hour (0-23) in user's timezone
  const hourlyGroups = trades.reduce((groups, trade) => {
    const hour = parseInt(formatInTimeZone(new Date(trade.entryDate), timezone, 'H'), 10);
    if (!groups[hour]) groups[hour] = [];
    groups[hour].push(trade);
    return groups;
  }, {} as Record<number, Trade[]>);
  
  // Calculate hourly performance
  const hourlyPerformance = Array.from({ length: 24 }, (_, hour) => {
    const hourTrades = hourlyGroups[hour] || [];
    const metrics = calculateTimeMetrics(hourTrades, timezone);
    return metrics ? { ...metrics, period: `${hour}:00-${hour}:59` } : null;
  }).filter(h => h !== null);
  
  // Group trades by day of week in user's timezone
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekGroups = trades.reduce((groups, trade) => {
    const dayOfWeek = parseInt(formatInTimeZone(new Date(trade.entryDate), timezone, 'e'), 10) % 7;
    if (!groups[dayOfWeek]) groups[dayOfWeek] = [];
    groups[dayOfWeek].push(trade);
    return groups;
  }, {} as Record<number, Trade[]>);
  
  // Calculate day of week performance
  const dayOfWeekPerformance = dayNames.map((dayName, index) => {
    const dayTrades = dayOfWeekGroups[index] || [];
    const metrics = calculateTimeMetrics(dayTrades, timezone);
    return metrics ? { ...metrics, period: dayName } : null;
  }).filter(d => d !== null);
  
  // Calculate session performance using user's timezone
  const sessionPerformance = sessions.map(sessionInfo => {
    const sessionTrades = trades.filter(trade => {
      const hour = parseInt(formatInTimeZone(new Date(trade.entryDate), timezone, 'H'), 10);
      if (sessionInfo.startHour <= sessionInfo.endHour) {
        return hour >= sessionInfo.startHour && hour <= sessionInfo.endHour;
      } else {
        // Handle overnight sessions (e.g., Asian session)
        return hour >= sessionInfo.startHour || hour <= sessionInfo.endHour;
      }
    });
    
    const metrics = calculateTimeMetrics(sessionTrades, timezone);
    if (!metrics) return null;
    
    return {
      session: sessionInfo.session,
      description: sessionInfo.description,
      startHour: sessionInfo.startHour,
      endHour: sessionInfo.endHour,
      totalTrades: metrics.totalTrades,
      netPnL: metrics.netPnL,
      winRate: metrics.winRate,
      averageWin: metrics.averageWin,
      averageLoss: metrics.averageLoss,
      profitFactor: metrics.profitFactor,
      consistency: metrics.consistency
    };
  }).filter(s => s !== null);
  
  // Find best and worst periods
  const bestTradingHour = hourlyPerformance.length > 0 ? hourlyPerformance.reduce((best, current) => 
    current.netPnL > best.netPnL ? current : best
  ) : null;
  
  const worstTradingHour = hourlyPerformance.length > 0 ? hourlyPerformance.reduce((worst, current) => 
    current.netPnL < worst.netPnL ? current : worst
  ) : null;
  
  const bestTradingDay = dayOfWeekPerformance.length > 0 ? dayOfWeekPerformance.reduce((best, current) => 
    current.netPnL > best.netPnL ? current : best
  ) : null;
  
  const worstTradingDay = dayOfWeekPerformance.length > 0 ? dayOfWeekPerformance.reduce((worst, current) => 
    current.netPnL < worst.netPnL ? current : worst
  ) : null;
  
  const bestSession = sessionPerformance.length > 0 ? sessionPerformance.reduce((best, current) => 
    current.netPnL > best.netPnL ? current : best
  ) : null;
  
  const worstSession = sessionPerformance.length > 0 ? sessionPerformance.reduce((worst, current) => 
    current.netPnL < worst.netPnL ? current : worst
  ) : null;
  
  // Identify optimal trading windows (hours with >60% win rate and positive PnL)
  const optimalTradingWindows = hourlyPerformance
    .filter(h => h.winRate > 60 && h.netPnL > 0 && h.totalTrades >= 5)
    .sort((a, b) => b.netPnL - a.netPnL)
    .slice(0, 3)
    .map(h => h.period);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (bestTradingHour) {
    recommendations.push(`Focus trading during ${bestTradingHour.period} (${bestTradingHour.netPnL.toFixed(2)} net PnL, ${bestTradingHour.winRate.toFixed(1)}% win rate)`);
  }
  
  if (worstTradingHour && worstTradingHour.netPnL < -100) {
    recommendations.push(`Avoid trading during ${worstTradingHour.period} (${worstTradingHour.netPnL.toFixed(2)} net PnL, ${worstTradingHour.winRate.toFixed(1)}% win rate)`);
  }
  
  if (bestTradingDay) {
    recommendations.push(`${bestTradingDay.period} shows best performance (${bestTradingDay.netPnL.toFixed(2)} net PnL)`);
  }
  
  if (worstTradingDay && worstTradingDay.netPnL < -100) {
    recommendations.push(`Consider reducing activity on ${worstTradingDay.period} (${worstTradingDay.netPnL.toFixed(2)} net PnL)`);
  }
  
  if (bestSession) {
    recommendations.push(`${bestSession.session} is your most profitable session (${bestSession.netPnL.toFixed(2)} net PnL)`);
  }
  
  if (optimalTradingWindows.length > 0) {
    recommendations.push(`Optimal trading windows: ${optimalTradingWindows.join(', ')}`);
  }
  
  return {
    hourlyPerformance: hourlyPerformance.sort((a, b) => {
      const aHour = parseInt(a.period.split(':')[0]);
      const bHour = parseInt(b.period.split(':')[0]);
      return aHour - bHour;
    }),
    dayOfWeekPerformance,
    sessionPerformance,
    bestTradingHour,
    worstTradingHour,
    bestTradingDay,
    worstTradingDay,
    bestSession,
    worstSession,
    optimalTradingWindows,
    recommendations
  };
}

export const getTimeOfDayPerformance = tool({
  description: 'Get detailed time-based performance analysis including hourly, daily, and session-based trading patterns',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Optional start date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    endDate: z.string().optional().describe('Optional end date to filter trades (format: 2025-01-14T14:33:01.000Z)'),
    timezone: z.string().optional().describe('Timezone for time analysis (e.g., UTC, EST, PST)')
  }),
  execute: async ({ startDate, endDate, timezone = 'UTC' }: { startDate?: string, endDate?: string, timezone?: string }) => {
    console.log(`[getTimeOfDayPerformance] startDate: ${startDate}, endDate: ${endDate}, timezone: ${timezone}`);
    
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
    
    return analyzeTimeOfDay(trades, timezone);
  }
}); 