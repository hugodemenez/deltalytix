export interface ContributionGraphData {
  weeks: number;
  /** [dayOfWeek 0=Sun..6=Sat][weekIndex] → activity level 0–4 */
  grid: number[][];
  /** Raw commit counts per cell, same shape as grid */
  counts: number[][];
  monthLabels: { weekIndex: number; label: string }[];
  totalContributions: number;
}

const LEVEL_COLORS = [
  "bg-[#ebedf0] dark:bg-[#161b22]",
  "bg-[#9be9a8] dark:bg-[#0e4429]",
  "bg-[#40c463] dark:bg-[#006d32]",
  "bg-[#30a14e] dark:bg-[#26a641]",
  "bg-[#216e39] dark:bg-[#39d353]",
] as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatCellTitle(date: Date, count: number): string {
  const countLabel =
    count === 0
      ? "No commits"
      : count === 1
        ? "1 commit"
        : `${count} commits`;

  return `${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })}: ${countLabel}`;
}

function getCellDate(
  weekIndex: number,
  dayOfWeek: number,
  weeks: number,
  endDate: Date
): Date {
  const endWeekStart = new Date(endDate);
  endWeekStart.setDate(endDate.getDate() - endDate.getDay());
  endWeekStart.setHours(0, 0, 0, 0);

  const startDate = new Date(endWeekStart);
  startDate.setDate(endWeekStart.getDate() - (weeks - 1) * 7);

  const cellDate = new Date(startDate);
  cellDate.setDate(startDate.getDate() + weekIndex * 7 + dayOfWeek);
  return cellDate;
}

export function buildContributionGraph(
  dailyCounts: Map<string, number>,
  weeksToShow = 26
): ContributionGraphData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endWeekStart = new Date(today);
  endWeekStart.setDate(today.getDate() - today.getDay());

  const startDate = new Date(endWeekStart);
  startDate.setDate(endWeekStart.getDate() - (weeksToShow - 1) * 7);

  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array(weeksToShow).fill(0)
  );
  const rawCounts: number[][] = Array.from({ length: 7 }, () =>
    Array(weeksToShow).fill(0)
  );

  let totalContributions = 0;
  let maxCount = 0;

  for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + weekIndex * 7 + dayOfWeek);

      if (cellDate > today) continue;

      const dateKey = cellDate.toISOString().split("T")[0];
      const count = dailyCounts.get(dateKey) ?? 0;
      rawCounts[dayOfWeek][weekIndex] = count;
      totalContributions += count;
      if (count > maxCount) maxCount = count;
    }
  }

  for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const count = rawCounts[dayOfWeek][weekIndex];
      grid[dayOfWeek][weekIndex] = countToLevel(count, maxCount);
    }
  }

  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;

  for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + weekIndex * 7);
    const month = weekDate.getMonth();

    if (month !== lastMonth) {
      monthLabels.push({
        weekIndex,
        label: weekDate.toLocaleDateString("en-US", { month: "short" }),
      });
      lastMonth = month;
    }
  }

  return {
    weeks: weeksToShow,
    grid,
    counts: rawCounts,
    monthLabels,
    totalContributions,
  };
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

export function ContributionGraph({
  data,
}: {
  data: ContributionGraphData;
}) {
  const endDate = new Date();

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div
            className="grid mb-1 pl-7"
            style={{
              gridTemplateColumns: `repeat(${data.weeks}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: data.weeks }).map((_, weekIndex) => {
              const label = data.monthLabels.find(
                (m) => m.weekIndex === weekIndex
              );
              return (
                <div
                  key={weekIndex}
                  className="text-[10px] text-muted-foreground leading-none"
                >
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          {/* Grid: day labels + cells */}
          <div className="flex gap-1">
            <div className="flex flex-col gap-[3px] pt-[1px] shrink-0 w-6">
              {DAY_LABELS.map((day, index) => (
                <div
                  key={day}
                  className="h-[11px] text-[10px] leading-[11px] text-muted-foreground"
                  aria-hidden={index % 2 === 0}
                >
                  {index % 2 === 1 ? day : ""}
                </div>
              ))}
            </div>

            <div
              className="grid flex-1 gap-[3px]"
              style={{
                gridTemplateColumns: `repeat(${data.weeks}, minmax(0, 1fr))`,
                gridTemplateRows: "repeat(7, 11px)",
              }}
              role="img"
              aria-label={`${data.totalContributions} commits in the last ${data.weeks} weeks`}
            >
              {data.grid.map((row, dayOfWeek) =>
                row.map((level, weekIndex) => {
                  const count = data.counts[dayOfWeek][weekIndex];
                  const cellDate = getCellDate(
                    weekIndex,
                    dayOfWeek,
                    data.weeks,
                    endDate
                  );

                  return (
                    <div
                      key={`${dayOfWeek}-${weekIndex}`}
                      className={`rounded-[2px] ${LEVEL_COLORS[level]}`}
                      title={formatCellTitle(cellDate, count)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {Intl.NumberFormat("en").format(data.totalContributions)}
          </span>{" "}
          commits in the last {data.weeks} weeks
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {LEVEL_COLORS.map((color, index) => (
            <div
              key={index}
              className={`w-[11px] h-[11px] rounded-[2px] ${color}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
