import { Trade } from "@prisma/client"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { StatisticsProps } from "./types"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function parsePositionTime(timeInSeconds: number): string {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutesLeft = Math.floor((timeInSeconds - (hours * 3600)) / 60);
  const secondsLeft = timeInSeconds - (hours * 3600) - (minutesLeft * 60);
  // Check if hours, minutesLeft seconds lefts aren't NaN
  if (isNaN(hours) || isNaN(minutesLeft) || isNaN(secondsLeft)) {
    return '0';
  }
  return `${hours}h ${minutesLeft}m ${secondsLeft}s`;
}

export function calculateStatistics(formattedTrades: Trade[]): StatisticsProps {
  const initialStatistics: StatisticsProps = {
    cumulativeFees: 0,
    cumulativePnl: 0,
    winningStreak: 0,
    winRate: 0,
    nbTrades: 0,
    nbBe: 0,
    nbWin: 0,
    nbLoss: 0,
    totalPositionTime: 0,
    averagePositionTime: ''
  };

  const statistics = formattedTrades.reduce((acc: StatisticsProps, trade: Trade) => {
    const pnl = parseFloat(trade.pnl.replace('(', '-').replace(')', '').replace('$', ''));
    
    acc.nbTrades++;
    acc.cumulativePnl += pnl;
    acc.cumulativeFees += trade.commission;
    acc.totalPositionTime += trade.timeInPosition;

    if (pnl === 0) {
      acc.nbBe++;
    } else if (pnl > 0) {
      acc.nbWin++;
      acc.winningStreak++;
    } else {
      acc.nbLoss++;
      acc.winningStreak = 0;
    }

    const totalTrades = acc.nbWin + acc.nbLoss;
    acc.winRate = totalTrades > 0 ? (acc.nbWin / totalTrades) * 100 : 0;

    return acc;
  }, initialStatistics);

  const averageTimeInSeconds = Math.round(statistics.totalPositionTime / formattedTrades.length);
  statistics.averagePositionTime = parsePositionTime(averageTimeInSeconds);

  return statistics;
}

export function formatCalendarData(trades: Trade[]) {
  return trades.reduce((acc: any, trade: Trade) => {
    const date = format(new Date(trade.buyDate), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = { pnl: 0, tradeNumber: 0, longNumber: 0, shortNumber: 0, trades: [] }
    }
    acc[date].tradeNumber++
    acc[date].pnl += parseFloat(trade.pnl.replace('(', '-').replace(')', '').replace('$', ''))-trade.commission;

    const isLong = trade.side ? (trade.side === 'long' || trade.side === 'buy' || trade.side === 'B') : (new Date(trade.buyDate) < new Date(trade.sellDate))
    acc[date].longNumber += isLong ? 1 : 0
    acc[date].shortNumber += isLong ? 0 : 1
    acc[date].trades.push(trade)
    return acc
  }, {})
}