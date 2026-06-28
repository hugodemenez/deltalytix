export interface CommitRecord {
  date: string;
  authorName: string;
}

export interface DayActivity {
  date: string;
  count: number;
}

export interface ContributorActivity {
  name: string;
  count: number;
}

export interface WeekDetail {
  weekIndex: number;
  weekStart: string;
  weekEnd: string;
  count: number;
  days: DayActivity[];
  contributors: ContributorActivity[];
}

export interface MonthLabel {
  weekIndex: number;
  month: number;
}

export interface WeeklyYearData {
  year: number;
  weekCount: number;
  counts: number[];
  levels: number[];
  monthLabels: MonthLabel[];
  weekDetails: WeekDetail[];
  totalContributions: number;
  visibleWeekCount: number;
}

export interface ContributionGraphData {
  years: Record<number, WeeklyYearData>;
  availableYears: number[];
  defaultYear: number;
}

/** Quarter markers keep mobile labels readable without crowding the axis. */
const KEY_MONTHS = new Set([0, 3, 6, 9]);

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getYearWeekStarts(year: number): Date[] {
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

function buildSparseMonthLabels(weekStarts: Date[]): MonthLabel[] {
  const labels: MonthLabel[] = [];

  weekStarts.forEach((weekStart, weekIndex) => {
    const month = weekStart.getMonth();
    const previousWeek = weekIndex > 0 ? weekStarts[weekIndex - 1] : null;
    const isNewMonth = !previousWeek || previousWeek.getMonth() !== month;

    if (KEY_MONTHS.has(month) && isNewMonth) {
      labels.push({ weekIndex, month });
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

function buildWeekDetail(
  weekStart: Date,
  weekIndex: number,
  year: number,
  commits: CommitRecord[]
): WeekDetail {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const dayCounts = new Map<string, number>();
  const contributorCounts = new Map<string, number>();
  let count = 0;

  for (const commit of commits) {
    const commitDate = startOfDay(new Date(`${commit.date}T00:00:00`));
    if (commitDate < weekStart || commitDate > weekEnd) continue;
    if (commitDate.getFullYear() !== year) continue;

    count++;
    dayCounts.set(commit.date, (dayCounts.get(commit.date) ?? 0) + 1);
    contributorCounts.set(
      commit.authorName,
      (contributorCounts.get(commit.authorName) ?? 0) + 1
    );
  }

  const days: DayActivity[] = Array.from(dayCounts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayCount]) => ({
      date,
      count: dayCount,
    }));

  const contributors: ContributorActivity[] = Array.from(
    contributorCounts.entries()
  )
    .map(([name, contributorCount]) => ({ name, count: contributorCount }))
    .sort((left, right) => right.count - left.count);

  return {
    weekIndex,
    weekStart: toDateKey(weekStart),
    weekEnd: toDateKey(weekEnd),
    count,
    days,
    contributors,
  };
}

export function buildWeeklyYearGraph(
  commits: CommitRecord[],
  year: number,
  today = new Date()
): WeeklyYearData {
  const weekStarts = getYearWeekStarts(year);
  const weekCount = weekStarts.length;

  const weekDetails = weekStarts.map((weekStart, weekIndex) =>
    buildWeekDetail(weekStart, weekIndex, year, commits)
  );
  const counts = weekDetails.map((detail) => detail.count);

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
    monthLabels: buildSparseMonthLabels(weekStarts),
    weekDetails,
    totalContributions,
    visibleWeekCount,
  };
}

export function buildContributionGraphData(
  commits: CommitRecord[],
  firstYear: number,
  lastYear: number,
  today = new Date()
): ContributionGraphData {
  const availableYears: number[] = [];
  const years: Record<number, WeeklyYearData> = {};

  for (let year = firstYear; year <= lastYear; year++) {
    availableYears.push(year);
    years[year] = buildWeeklyYearGraph(commits, year, today);
  }

  return {
    years,
    availableYears,
    defaultYear: lastYear,
  };
}

export function formatWeekRange(detail: WeekDetail, locale: string): string {
  const start = new Date(`${detail.weekStart}T00:00:00`);
  const end = new Date(`${detail.weekEnd}T00:00:00`);

  const startLabel = start.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function formatMonthLabel(month: number, locale: string): string {
  return new Date(2024, month, 1).toLocaleDateString(locale, { month: "short" });
}

export function formatDayLabel(date: string, locale: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
