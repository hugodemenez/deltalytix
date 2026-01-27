import { Trade } from "@/prisma/generated/prisma/browser"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { StatisticsProps } from "@/app/[locale]/dashboard/types/statistics"
import { Account } from "@/context/data-provider"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parsePositionTime(timeInSeconds: number): string {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutesLeft = Math.floor((timeInSeconds - (hours * 3600)) / 60);
  const secondsLeft = Math.floor(timeInSeconds - (hours * 3600) - (minutesLeft * 60));
  
  if (isNaN(hours) || isNaN(minutesLeft) || isNaN(secondsLeft)) {
    return '0';
  }
  
  const formattedTime = [
    hours > 0 ? `${hours}h` : '',
    `${minutesLeft}m`,
    `${secondsLeft}s`
  ].filter(Boolean).join(' ');
  
  return formattedTime;
}

export function calculateStatistics(trades: Trade[], accounts: Account[] = []): StatisticsProps {
  if (!trades.length) {
    return {
      cumulativeFees: 0,
      cumulativePnl: 0,
      winningStreak: 0,
      winRate: 0,
      nbTrades: 0,
      nbBe: 0,
      nbWin: 0,
      nbLoss: 0,
      totalPositionTime: 0,
      averagePositionTime: '0s',
      profitFactor: 1,
      grossLosses: 0,
      grossWin: 0,
      // Payout statistics
      totalPayouts: 0,
      nbPayouts: 0,
    }
  }

  // // Create a map of accounts for quick lookup
  // const accountMap = new Map(accounts.map(account => [account.number, account]));

  // // Filter trades based on reset dates for each account
  // const filteredTrades = trades.filter(trade => {
  //   const account = accountMap.get(trade.accountNumber);
  //   if (!account || !account.resetDate) {
  //     return true; // Include trade if no account found or no reset date
  //   }
    
  //   // Only include trades that occurred after the reset date
  //   return new Date(trade.entryDate) >= new Date(account.resetDate);
  // });

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
    averagePositionTime: '0s',
    profitFactor: 1,
    grossLosses: 0,
    grossWin: 0,
    // Payout statistics
    totalPayouts: 0,
    nbPayouts: 0,
  };

  const statistics = trades.reduce((acc: StatisticsProps, trade: Trade) => {
    const pnl = trade.pnl;
    
    acc.nbTrades++;
    acc.cumulativePnl += pnl;
    acc.cumulativeFees += trade.commission;
    acc.totalPositionTime += trade.timeInPosition;

    if (pnl === 0) {
      acc.nbBe++;
    } else if (pnl > 0) {
      acc.nbWin++;
      acc.winningStreak++;
      acc.grossWin += pnl;
    } else {
      acc.nbLoss++;
      acc.winningStreak = 0;
      acc.grossLosses += Math.abs(pnl);
    }

    const totalTrades = acc.nbWin + acc.nbLoss;
    acc.winRate = totalTrades > 0 ? (acc.nbWin / totalTrades) * 100 : 0;

    return acc;
  }, initialStatistics);

  // Get unique account numbers from the filtered trades
  const tradeAccountNumbers = new Set(trades.map(trade => trade.accountNumber));
  
  // Calculate total payouts only from accounts that have trades in the current dataset
  // and only include payouts that occurred after the reset date
  accounts.forEach(account => {
    if (tradeAccountNumbers.has(account.number)) {
      const payouts = account.payouts || [];
      payouts.forEach(payout => {
        // Only include payouts that occurred after the reset date
        if (!account.resetDate || new Date(payout.date) >= new Date(account.resetDate)) {
          statistics.totalPayouts += payout.amount;
          statistics.nbPayouts++;
        }
      });
    }
  });

  const averageTimeInSeconds = Math.round(statistics.totalPositionTime / trades.length);
  statistics.averagePositionTime = parsePositionTime(averageTimeInSeconds);

  return statistics;
}

export function formatCalendarData(trades: Trade[], accounts: Account[] = []) {
  // // Create a map of accounts for quick lookup
  // const accountMap = new Map(accounts.map(account => [account.number, account]));

  // // Filter trades based on reset dates for each account
  // const filteredTrades = trades.filter(trade => {
  //   const account = accountMap.get(trade.accountNumber);
  //   if (!account || !account.resetDate) {
  //     return true; // Include trade if no account found or no reset date
  //   }
    
  //   // Only include trades that occurred after the reset date
  //   return new Date(trade.entryDate) >= new Date(account.resetDate);
  // });

  return trades.reduce((acc: any, trade: Trade) => {
    // Parse the date and format it in UTC to ensure consistency across timezones
    const date = formatInTimeZone(new Date(trade.entryDate), 'UTC', 'yyyy-MM-dd')
    
    if (!acc[date]) {
      acc[date] = { pnl: 0, tradeNumber: 0, longNumber: 0, shortNumber: 0, trades: [] }
    }
    acc[date].tradeNumber++
    acc[date].pnl += trade.pnl-trade.commission;

    const isLong = trade.side 
      ? (trade.side.toLowerCase() === 'long' || trade.side.toLowerCase() === 'buy' || trade.side.toLowerCase() === 'b') 
      : (new Date(trade.entryDate).getTime() < new Date(trade.closeDate).getTime())
    
    acc[date].longNumber += isLong ? 1 : 0
    acc[date].shortNumber += isLong ? 0 : 1
    acc[date].trades.push(trade)
    return acc
  }, {})
}

export function groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key] as string] = result[currentValue[key] as string] || []).push(
      currentValue
    );
    return result;
  }, {} as { [key: string]: T[] });
}

export function calculateTradingDays(trades: Trade[], minPnlToCountAsDay?: number | null): {
  totalTradingDays: number;
  validTradingDays: number;
  dailyPnL: { [date: string]: number };
} {
  if (!trades.length) {
    return {
      totalTradingDays: 0,
      validTradingDays: 0,
      dailyPnL: {}
    };
  }

  // Group trades by date and calculate daily PnL
  const dailyPnL: { [date: string]: number } = {};
  
  trades.forEach(trade => {
    const tradeDate = new Date(trade.entryDate);
    const dateKey = tradeDate.toISOString().split('T')[0];
    
    if (!dailyPnL[dateKey]) {
      dailyPnL[dateKey] = 0;
    }
    
    // Calculate net PnL (including commission)
    dailyPnL[dateKey] += trade.pnl - (trade.commission || 0);
  });

  const totalTradingDays = Object.keys(dailyPnL).length;
  
  // Count valid trading days based on threshold
  let validTradingDays = totalTradingDays;
  
  if (minPnlToCountAsDay !== null && minPnlToCountAsDay !== undefined && minPnlToCountAsDay > 0) {
    validTradingDays = Object.values(dailyPnL).filter(dailyPnl => dailyPnl >= minPnlToCountAsDay).length;
  }

  return {
    totalTradingDays,
    validTradingDays,
    dailyPnL
  };
}

export function generateTradeHash(trade: Partial<Trade>): string {
  // Handle undefined values by converting them to empty strings or default values
  const hashString = `${trade.userId || ''}-${trade.accountNumber || ''}-${trade.instrument || ''}-${trade.entryDate || ''}-${trade.closeDate || ''}-${trade.quantity || 0}-${trade.entryId || ''}-${trade.closeId || ''}-${trade.timeInPosition || 0}`
  return hashString
}