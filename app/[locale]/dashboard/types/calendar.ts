import { Trade } from "@/prisma/generated/prisma/browser";

export interface CalendarEntry {
  pnl: number;
  tradeNumber: number;
  longNumber: number;
  shortNumber: number;
  trades: Trade[];
}

export interface CalendarData {
  [date: string]: CalendarEntry;
}
