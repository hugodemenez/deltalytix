"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ContributionGraphData,
  type WeekDetail,
  formatWeekRange,
} from "@/lib/contribution-graph";

const LEVEL_COLORS = [
  "bg-[#ebedf0] dark:bg-[#161b22]",
  "bg-[#9be9a8] dark:bg-[#0e4429]",
  "bg-[#40c463] dark:bg-[#006d32]",
  "bg-[#30a14e] dark:bg-[#26a641]",
  "bg-[#216e39] dark:bg-[#39d353]",
] as const;

function WeekDetailOverlay({
  detail,
  anchorRect,
  onClose,
}: {
  detail: WeekDetail;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const panelWidth = overlayRef.current?.offsetWidth ?? 224;
    const margin = 12;
    const centerX = anchorRect.left + anchorRect.width / 2;
    const left = Math.min(
      Math.max(centerX, margin + panelWidth / 2),
      window.innerWidth - margin - panelWidth / 2
    );
    const top = anchorRect.bottom + 8;
    setPosition({ left, top });
  }, [anchorRect]);

  return (
    <>
      <button
        type="button"
        aria-label="Close week details"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        ref={overlayRef}
        className="fixed z-50 w-56 max-w-[calc(100vw-24px)] rounded-md border border-border bg-popover p-3 text-xs shadow-lg"
        style={{
          left: position.left,
          top: position.top,
          transform: "translateX(-50%)",
        }}
        role="dialog"
        aria-label={`Week details for ${formatWeekRange(detail)}`}
      >
        <p className="font-medium text-foreground">{formatWeekRange(detail)}</p>
        <p className="mt-1 text-muted-foreground">
          {detail.count === 0
            ? "No commits"
            : detail.count === 1
              ? "1 commit"
              : `${detail.count} commits`}
        </p>

        {detail.days.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Active days
            </p>
            <ul className="space-y-1">
              {detail.days.map((day) => (
                <li key={day.date} className="flex items-center justify-between gap-2">
                  <span>{day.label}</span>
                  <span className="text-muted-foreground">
                    {day.count === 1 ? "1 commit" : `${day.count} commits`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.contributors.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Contributors
            </p>
            <ul className="space-y-1">
              {detail.contributors.map((contributor) => (
                <li
                  key={contributor.name}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{contributor.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {contributor.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

function MonthLabelRow({
  weekCount,
  visibleWeekCount,
  monthLabels,
  position,
}: {
  weekCount: number;
  visibleWeekCount: number;
  monthLabels: ContributionGraphData["years"][number]["monthLabels"];
  position: "top" | "bottom";
}) {
  const labelsForPosition = monthLabels.filter((label) => label.position === position);

  return (
    <div className="flex w-full gap-px">
      {Array.from({ length: weekCount }).map((_, weekIndex) => {
        const label = labelsForPosition.find((entry) => entry.weekIndex === weekIndex);
        const isVisible = weekIndex < visibleWeekCount;

        return (
          <div
            key={weekIndex}
            className={`flex-1 basis-0 overflow-hidden text-center text-[8px] leading-none sm:text-[9px] md:text-[10px] ${
              position === "top" ? "mb-0.5 h-2.5" : "mt-0.5 h-2.5"
            } ${isVisible && label ? "text-muted-foreground" : "text-transparent"}`}
          >
            {label?.label ?? ""}
          </div>
        );
      })}
    </div>
  );
}

export function ContributionGraph({
  data,
}: {
  data: ContributionGraphData;
}) {
  const minYear = data.availableYears[0] ?? data.defaultYear;
  const maxYear = data.availableYears[data.availableYears.length - 1] ?? data.defaultYear;
  const [year, setYear] = useState(data.defaultYear);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const yearData = data.years[year];
  const closeOverlay = useCallback(() => {
    setActiveWeek(null);
    setAnchorRect(null);
  }, []);

  useEffect(() => {
    closeOverlay();
  }, [year, closeOverlay]);

  useEffect(() => {
    if (activeWeek === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOverlay();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeWeek, closeOverlay]);

  if (!yearData) return null;

  const canGoBack = year > minYear;
  const canGoForward = year < maxYear;
  const activeDetail =
    activeWeek !== null ? yearData.weekDetails[activeWeek] ?? null : null;

  const openWeekDetail = (weekIndex: number, target: HTMLElement) => {
    if (weekIndex >= yearData.visibleWeekCount) return;

    if (activeWeek === weekIndex) {
      closeOverlay();
      return;
    }

    setActiveWeek(weekIndex);
    setAnchorRect(target.getBoundingClientRect());
  };

  return (
    <div className="relative w-full min-w-0 select-none">
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

      <div className="w-full">
        <MonthLabelRow
          weekCount={yearData.weekCount}
          visibleWeekCount={yearData.visibleWeekCount}
          monthLabels={yearData.monthLabels}
          position="top"
        />

        <div
          className="flex w-full gap-px"
          role="img"
          aria-label={`${yearData.totalContributions} commits in ${year}`}
        >
          {yearData.levels.map((level, weekIndex) => {
            const isVisible = weekIndex < yearData.visibleWeekCount;
            const isActive = activeWeek === weekIndex;

            if (!isVisible) {
              return (
                <div
                  key={weekIndex}
                  className="h-3 flex-1 basis-0 rounded-[1px] opacity-0 sm:h-3.5 md:h-4"
                  aria-hidden
                />
              );
            }

            return (
              <button
                key={weekIndex}
                type="button"
                aria-label={`Week ${weekIndex + 1}, ${yearData.counts[weekIndex]} commits`}
                aria-pressed={isActive}
                className={`h-3 flex-1 basis-0 rounded-[1px] sm:h-3.5 md:h-4 ${LEVEL_COLORS[level]} ${
                  isActive ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""
                }`}
                onClick={(event) => openWeekDetail(weekIndex, event.currentTarget)}
              />
            );
          })}
        </div>

        <MonthLabelRow
          weekCount={yearData.weekCount}
          visibleWeekCount={yearData.visibleWeekCount}
          monthLabels={yearData.monthLabels}
          position="bottom"
        />
      </div>

      {activeDetail && anchorRect && (
        <WeekDetailOverlay
          detail={activeDetail}
          anchorRect={anchorRect}
          onClose={closeOverlay}
        />
      )}

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
