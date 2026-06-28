"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ContributionGraphData,
  formatWeekTitle,
  getWeekStartDate,
} from "@/lib/contribution-graph";

const LEVEL_COLORS = [
  "bg-[#ebedf0] dark:bg-[#161b22]",
  "bg-[#9be9a8] dark:bg-[#0e4429]",
  "bg-[#40c463] dark:bg-[#006d32]",
  "bg-[#30a14e] dark:bg-[#26a641]",
  "bg-[#216e39] dark:bg-[#39d353]",
] as const;

const WEEK_CELL_CLASS =
  "flex-1 min-w-[5px] sm:min-w-[6px] md:min-w-[8px] lg:min-w-[10px]";

export function ContributionGraph({
  data,
}: {
  data: ContributionGraphData;
}) {
  const minYear = data.availableYears[0] ?? data.defaultYear;
  const maxYear = data.availableYears[data.availableYears.length - 1] ?? data.defaultYear;
  const [year, setYear] = useState(data.defaultYear);

  const yearData = data.years[year];
  if (!yearData) return null;

  const canGoBack = year > minYear;
  const canGoForward = year < maxYear;

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setYear((current) => current - 1)}
          disabled={!canGoBack}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-foreground">{year}</span>
        <button
          type="button"
          onClick={() => setYear((current) => current + 1)}
          disabled={!canGoForward}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto overscroll-x-contain touch-pan-x pb-1">
        <div
          className="w-full min-w-[280px] sm:min-w-0"
          style={{
            minWidth: `max(100%, ${yearData.weekCount * 6}px)`,
          }}
        >
          <div className={`mb-1 flex gap-[2px] sm:gap-[3px]`}>
            {Array.from({ length: yearData.weekCount }).map((_, weekIndex) => {
              const label = yearData.monthLabels.find(
                (entry) => entry.weekIndex === weekIndex
              );
              const isVisible = weekIndex < yearData.visibleWeekCount;

              return (
                <div
                  key={weekIndex}
                  className={`${WEEK_CELL_CLASS} truncate text-[9px] leading-none sm:text-[10px] ${
                    isVisible ? "text-muted-foreground" : "text-transparent"
                  }`}
                >
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div
            className="flex gap-[2px] sm:gap-[3px]"
            role="img"
            aria-label={`${yearData.totalContributions} commits in ${year}`}
          >
            {yearData.levels.map((level, weekIndex) => {
              const isVisible = weekIndex < yearData.visibleWeekCount;
              if (!isVisible) {
                return (
                  <div
                    key={weekIndex}
                    className={`${WEEK_CELL_CLASS} h-3 max-h-3 rounded-[2px] opacity-0 sm:h-4 sm:max-h-4 md:h-[16px] md:max-h-[16px]`}
                    aria-hidden
                  />
                );
              }

              const count = yearData.counts[weekIndex];
              const weekStart = getWeekStartDate(year, weekIndex);

              return (
                <div
                  key={weekIndex}
                  className={`${WEEK_CELL_CLASS} h-3 max-h-3 rounded-[2px] sm:h-4 sm:max-h-4 md:h-[16px] md:max-h-[16px] ${LEVEL_COLORS[level]}`}
                  title={formatWeekTitle(weekStart, count)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {Intl.NumberFormat("en").format(yearData.totalContributions)}
        </span>{" "}
        commits in {year}
        <span className="hidden sm:inline"> · main &amp; beta</span>
      </p>
    </div>
  );
}
