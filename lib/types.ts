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

