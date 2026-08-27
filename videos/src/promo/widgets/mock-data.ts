/**
 * Landing preview mock data, copied from:
 * - app/[locale]/(landing)/components/calendar-preview.tsx (`buildDemoCalendarData`)
 * - app/[locale]/(landing)/components/performance-visualization-chart.tsx
 *
 * Pinned to August 2026 so promo renders stay deterministic.
 */

export type CalendarDayEntry = {
  pnl: number;
  tradeNumber: number;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export const PROMO_YEAR = 2026;
export const PROMO_MONTH = 7;
export const PROMO_TODAY_DAY = 27;

const DEMO_CALENDAR_ENTRIES = [
  { day: 1, pnl: 120, trades: 1 },
  { day: 2, pnl: 620, trades: 4 },
  { day: 3, pnl: 80, trades: 2 },
  { day: 4, pnl: -240, trades: 3 },
  { day: 6, pnl: 380, trades: 2 },
  { day: 7, pnl: -60, trades: 1 },
  { day: 9, pnl: 980, trades: 5 },
  { day: 11, pnl: 210, trades: 2 },
  { day: 12, pnl: -120, trades: 2 },
  { day: 14, pnl: 320, trades: 1 },
  { day: 15, pnl: 540, trades: 3 },
  { day: 18, pnl: -320, trades: 4 },
  { day: 19, pnl: 90, trades: 1 },
  { day: 21, pnl: 760, trades: 3 },
  { day: 22, pnl: -45, trades: 1 },
  { day: 24, pnl: 150, trades: 2 },
  { day: 25, pnl: 70, trades: 1 },
  { day: 27, pnl: 420, trades: 3 },
  { day: 29, pnl: -95, trades: 1 },
] as const;

const pad = (value: number) => String(value).padStart(2, "0");

export const isoDate = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

export const buildDemoCalendarData = (): Record<string, CalendarDayEntry> => {
  return DEMO_CALENDAR_ENTRIES.reduce<Record<string, CalendarDayEntry>>(
    (acc, { day, pnl, trades }) => {
      acc[isoDate(PROMO_YEAR, PROMO_MONTH, day)] = {
        pnl,
        tradeNumber: trades,
      };
      return acc;
    },
    {},
  );
};

export const equityData: ChartPoint[] = [
  { label: "1", value: 24820 },
  { label: "4", value: 25240 },
  { label: "7", value: 25090 },
  { label: "10", value: 25860 },
  { label: "13", value: 25620 },
  { label: "16", value: 26410 },
  { label: "19", value: 26980 },
  { label: "22", value: 26740 },
  { label: "25", value: 27580 },
  { label: "28", value: 28140 },
];

export const dailyPnlData: ChartPoint[] = [
  { label: "02", value: 420 },
  { label: "05", value: -180 },
  { label: "08", value: 610 },
  { label: "11", value: 290 },
  { label: "14", value: -260 },
  { label: "17", value: 740 },
  { label: "20", value: 360 },
  { label: "23", value: -110 },
  { label: "26", value: 580 },
  { label: "29", value: 450 },
];

export const weekdayPnlData: ChartPoint[] = [
  { label: "Sun", value: 42 },
  { label: "Mon", value: 380 },
  { label: "Tue", value: -120 },
  { label: "Wed", value: 540 },
  { label: "Thu", value: 260 },
  { label: "Fri", value: 680 },
  { label: "Sat", value: -36 },
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Landing `distributionData` wins slice. */
export const WIN_RATE_PERCENT = 64;

export const MONTHLY_PNL = DEMO_CALENDAR_ENTRIES.reduce(
  (total, entry) => total + entry.pnl,
  0,
);

export const TRADE_COUNT = DEMO_CALENDAR_ENTRIES.reduce(
  (total, entry) => total + entry.trades,
  0,
);

export const formatUsd = (value: number) => {
  const sign = value > 0 ? "" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
};
