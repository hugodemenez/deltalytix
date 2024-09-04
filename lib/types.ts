import { Trade } from "@prisma/client";

export type CalendarEntry = {
  pnl: number;
  tradeNumber: number;
  longNumber: number;
  shortNumber: number;
  trades: Trade[];
};

export type CalendarData = {
  [date: string]: CalendarEntry;
};


export type StatisticsProps = {
  cumulativeFees: number;
  cumulativePnl: number;
  winningStreak: number;
  winRate: number;
  nbTrades: number;
  nbBe: number;
  nbWin: number;
  nbLoss: number;
  totalPositionTime: number;
  averagePositionTime: string;
}