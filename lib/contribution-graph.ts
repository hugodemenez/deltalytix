export interface WeeklyYearData {
  year: number;
  weekCount: number;
  counts: number[];
  levels: number[];
  monthLabels: { weekIndex: number; label: string }[];
  totalContributions: number;
  /** Weeks to render for this year (future weeks are omitted in the current year). */
  visibleWeekCount: number;
}

export interface ContributionGraphData {
  years: Record<number, WeeklyYearData>;
  availableYears: number[];
  defaultYear: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getYearWeekStarts(year: number): Date[] {
  const jan1 = startOfDay(new Date(year, 0, 1));
  const dec31 = startOfDay(new Date(year, 11, 31));

  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() - jan1.getDay());

  const weekStarts: Date[] = [];

  while (weekStarts.length < 54) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    if (weekStart > dec31) break;

    if (weekEnd >= jan1) {
      weekStarts.push(new Date(weekStart));
    }

    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weekStarts;
}

function countToLevel(count: number, maxCount: number): number {
  if (count === 0) return 0;
  if (maxCount <= 1) return 1;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function countCommitsInWeek(
  weekStart: Date,
  year: number,
  dailyCounts: Map<string, number>
): number {
  let total = 0;
  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + day);
    if (date.getFullYear() !== year) continue;
    const dateKey = date.toISOString().split("T")[0];
    total += dailyCounts.get(dateKey) ?? 0;
  }
  return total;
}

function buildMonthLabels(weekStarts: Date[]): { weekIndex: number; label: string }[] {
  const labels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;

  weekStarts.forEach((weekStart, weekIndex) => {
    const month = weekStart.getMonth();
    if (month !== lastMonth) {
      labels.push({
        weekIndex,
        label: weekStart.toLocaleDateString("en-US", { month: "short" }),
      });
      lastMonth = month;
    }
  });

  return labels;
}

function getVisibleWeekCount(
  year: number,
  weekStarts: Date[],
  today: Date
): number {
  if (year < today.getFullYear()) return weekStarts.length;
  if (year > today.getFullYear()) return 0;

  const todayStart = startOfDay(today);
  let visible = 0;

  for (const weekStart of weekStarts) {
    if (weekStart <= todayStart) {
      visible++;
    } else {
      break;
    }
  }

  return visible;
}

export function buildWeeklyYearGraph(
  dailyCounts: Map<string, number>,
  year: number,
  today = new Date()
): WeeklyYearData {
  const weekStarts = getYearWeekStarts(year);
  const weekCount = weekStarts.length;
  const counts = weekStarts.map((weekStart) =>
    countCommitsInWeek(weekStart, year, dailyCounts)
  );

  const visibleWeekCount = getVisibleWeekCount(year, weekStarts, today);
  const visibleCounts = counts.slice(0, visibleWeekCount);
  const maxCount = visibleCounts.length > 0 ? Math.max(...visibleCounts, 0) : 0;
  const levels = counts.map((count, index) =>
    index < visibleWeekCount ? countToLevel(count, maxCount) : 0
  );

  const totalContributions = visibleCounts.reduce((sum, count) => sum + count, 0);

  return {
    year,
    weekCount,
    counts,
    levels,
    monthLabels: buildMonthLabels(weekStarts),
    totalContributions,
    visibleWeekCount,
  };
}

export function buildContributionGraphData(
  dailyCounts: Map<string, number>,
  firstYear: number,
  lastYear: number,
  today = new Date()
): ContributionGraphData {
  const availableYears: number[] = [];
  const years: Record<number, WeeklyYearData> = {};

  for (let year = firstYear; year <= lastYear; year++) {
    availableYears.push(year);
    years[year] = buildWeeklyYearGraph(dailyCounts, year, today);
  }

  return {
    years,
    availableYears,
    defaultYear: lastYear,
  };
}

export function getWeekStartDate(year: number, weekIndex: number): Date {
  return getYearWeekStarts(year)[weekIndex] ?? new Date(year, 0, 1);
}

export function formatWeekTitle(weekStart: Date, count: number): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const countLabel =
    count === 0
      ? "No commits"
      : count === 1
        ? "1 commit"
        : `${count} commits`;

  const startLabel = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `Week of ${startLabel} – ${endLabel}: ${countLabel}`;
}
