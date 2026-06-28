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
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setYear((current) => current - 1)}
          disabled={!canGoBack}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-foreground">{year}</span>
        <button
          type="button"
          onClick={() => setYear((current) => current + 1)}
          disabled={!canGoForward}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div
            className="grid mb-1"
            style={{
              gridTemplateColumns: `repeat(${yearData.weekCount}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: yearData.weekCount }).map((_, weekIndex) => {
              const label = yearData.monthLabels.find(
                (entry) => entry.weekIndex === weekIndex
              );
              const isVisible = weekIndex < yearData.visibleWeekCount;

              return (
                <div
                  key={weekIndex}
                  className={`text-[10px] leading-none ${
                    isVisible ? "text-muted-foreground" : "text-transparent"
                  }`}
                >
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div
            className="grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${yearData.weekCount}, minmax(0, 1fr))`,
            }}
            role="img"
            aria-label={`${yearData.totalContributions} commits in ${year}`}
          >
            {yearData.levels.map((level, weekIndex) => {
              const isVisible = weekIndex < yearData.visibleWeekCount;
              if (!isVisible) {
                return (
                  <div
                    key={weekIndex}
                    className="h-[16px] rounded-[2px] opacity-0 pointer-events-none"
                    aria-hidden
                  />
                );
              }

              const count = yearData.counts[weekIndex];
              const weekStart = getWeekStartDate(year, weekIndex);

              return (
                <div
                  key={weekIndex}
                  className={`h-[16px] rounded-[2px] ${LEVEL_COLORS[level]}`}
                  title={formatWeekTitle(weekStart, count)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        <span className="font-medium text-foreground">
          {Intl.NumberFormat("en").format(yearData.totalContributions)}
        </span>{" "}
        commits in {year}
      </p>
    </div>
  );
}
