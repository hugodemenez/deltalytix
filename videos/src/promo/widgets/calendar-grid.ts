import {
  PROMO_MONTH,
  PROMO_TODAY_DAY,
  PROMO_YEAR,
  buildDemoCalendarData,
  isoDate,
  type CalendarDayEntry,
} from "./mock-data";

export type CalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  entry: CalendarDayEntry | null;
};

export type CalendarWeek = {
  days: CalendarCell[];
  weeklyTotal: number;
};

const DAYS_IN_GRID = 42;

const shiftMonth = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
};

export const buildPromoCalendar = () => {
  const calendarData = buildDemoCalendarData();
  const firstWeekday = new Date(PROMO_YEAR, PROMO_MONTH, 1).getDay();
  const daysInMonth = new Date(PROMO_YEAR, PROMO_MONTH + 1, 0).getDate();
  const todayIso = isoDate(PROMO_YEAR, PROMO_MONTH, PROMO_TODAY_DAY);

  const cells: CalendarCell[] = [];
  for (let index = 0; index < DAYS_IN_GRID; index++) {
    const offset = index - firstWeekday + 1;
    const { year, month, day } = shiftMonth(PROMO_YEAR, PROMO_MONTH, offset);
    const iso = isoDate(year, month, day);
    cells.push({
      iso,
      day,
      inMonth: offset >= 1 && offset <= daysInMonth,
      isToday: iso === todayIso,
      entry: calendarData[iso] ?? null,
    });
  }

  const weeks: CalendarWeek[] = [];
  for (let week = 0; week < 6; week++) {
    const days = cells.slice(week * 7, week * 7 + 7);
    weeks.push({
      days,
      weeklyTotal: days.reduce((total, cell) => total + (cell.entry?.pnl ?? 0), 0),
    });
  }

  const monthlyTotal = Object.values(calendarData).reduce(
    (total, entry) => total + entry.pnl,
    0,
  );

  return {
    label: "August 2026",
    monthlyTotal,
    weeks,
  };
};
