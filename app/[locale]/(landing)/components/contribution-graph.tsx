"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCurrentLocale, useI18n } from "@/locales/landing-client";
import {
  type ContributionGraphData,
  type WeekDetail,
  formatDayLabel,
  formatMonthLabel,
  formatWeekRange,
} from "@/lib/contribution-graph";

const LEVEL_COLORS = [
  "bg-[oklch(0.94_0.01_145)] dark:bg-[oklch(0.20_0.02_145)]",
  "bg-[oklch(0.85_0.08_145)] dark:bg-[oklch(0.35_0.06_145)]",
  "bg-[oklch(0.72_0.12_145)] dark:bg-[oklch(0.45_0.10_145)]",
  "bg-[oklch(0.58_0.14_145)] dark:bg-[oklch(0.55_0.12_145)]",
  "bg-[oklch(0.45_0.16_145)] dark:bg-[oklch(0.72_0.18_145)]",
] as const;

const UPCOMING_WEEK_COLOR = "bg-muted/70 dark:bg-muted/40";

function WeekDetailOverlay({
  detail,
  anchorRect,
  locale,
  onClose,
  t,
}: {
  detail: WeekDetail;
  anchorRect: DOMRect;
  locale: string;
  onClose: () => void;
  t: ReturnType<typeof useI18n>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const weekRange = formatWeekRange(detail, locale);

  useEffect(() => {
    const panelWidth = overlayRef.current?.offsetWidth ?? 224;
    const margin = 12;
    const centerX = anchorRect.left + anchorRect.width / 2;
    const left = Math.min(
      Math.max(centerX, margin + panelWidth / 2),
      window.innerWidth - margin - panelWidth / 2,
    );
    const top = anchorRect.bottom + 8;
    setPosition({ left, top });
  }, [anchorRect]);

  const commitLabel =
    detail.count === 0
      ? t("landing.openSource.contributionGraph.noCommits")
      : detail.count === 1
        ? t("landing.openSource.contributionGraph.oneCommit")
        : t("landing.openSource.contributionGraph.nCommits", {
            count: detail.count,
          });

  return (
    <>
      <button
        type="button"
        aria-label={t("landing.openSource.contributionGraph.closeWeekDetails")}
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
        aria-label={t("landing.openSource.contributionGraph.weekDetails", {
          range: weekRange,
        })}
      >
        <p className="font-medium text-foreground">{weekRange}</p>
        <p className="mt-1 text-muted-foreground">{commitLabel}</p>

        {detail.days.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("landing.openSource.contributionGraph.activeDays")}
            </p>
            <ul className="space-y-1">
              {detail.days.map((day) => (
                <li
                  key={day.date}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{formatDayLabel(day.date, locale)}</span>
                  <span className="text-muted-foreground">
                    {day.count === 1
                      ? t("landing.openSource.contributionGraph.oneCommit")
                      : t("landing.openSource.contributionGraph.nCommits", {
                          count: day.count,
                        })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.contributors.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("landing.openSource.contributionGraph.contributors")}
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

function MonthAxis({
  weekCount,
  monthLabels,
  locale,
}: {
  weekCount: number;
  monthLabels: ContributionGraphData["years"][number]["monthLabels"];
  locale: string;
}) {
  return (
    <div className="relative mb-1.5 h-4 w-full overflow-visible sm:h-5">
      {monthLabels.map(({ weekIndex, month }) => (
        <span
          key={`${weekIndex}-${month}`}
          className="absolute top-0 whitespace-nowrap text-[10px] font-medium leading-none text-foreground/70 sm:text-xs"
          style={{
            left: `${(weekIndex / Math.max(weekCount - 1, 1)) * 100}%`,
          }}
        >
          {formatMonthLabel(month, locale)}
        </span>
      ))}
    </div>
  );
}

export function ContributionGraph({ data }: { data: ContributionGraphData }) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const minYear = data.availableYears[0] ?? data.defaultYear;
  const maxYear =
    data.availableYears[data.availableYears.length - 1] ?? data.defaultYear;
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
    activeWeek !== null ? (yearData.weekDetails[activeWeek] ?? null) : null;

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
          aria-label={t("landing.openSource.contributionGraph.previousYear")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-foreground">{year}</span>
        <button
          type="button"
          onClick={() => setYear((current) => current + 1)}
          disabled={!canGoForward}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          aria-label={t("landing.openSource.contributionGraph.nextYear")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="w-full overflow-visible">
        <MonthAxis
          weekCount={yearData.weekCount}
          monthLabels={yearData.monthLabels}
          locale={locale}
        />

        <div
          className="flex w-full gap-px"
          role="img"
          aria-label={t("landing.openSource.contributionGraph.commitsInYear", {
            count: yearData.totalContributions.toLocaleString(locale),
            year,
          })}
        >
          {yearData.levels.map((level, weekIndex) => {
            const isPastOrCurrent = weekIndex < yearData.visibleWeekCount;
            const isActive = activeWeek === weekIndex;

            if (!isPastOrCurrent) {
              return (
                <div
                  key={weekIndex}
                  className={`h-3 flex-1 basis-0 rounded-[1px] sm:h-3.5 md:h-4 ${UPCOMING_WEEK_COLOR}`}
                  aria-hidden
                />
              );
            }

            return (
              <button
                key={weekIndex}
                type="button"
                aria-label={t("landing.openSource.contributionGraph.weekAria", {
                  week: weekIndex + 1,
                  count: yearData.counts[weekIndex],
                })}
                aria-pressed={isActive}
                className={`h-3 flex-1 basis-0 rounded-[1px] sm:h-3.5 md:h-4 ${LEVEL_COLORS[level]} ${
                  isActive
                    ? "ring-1 ring-primary ring-offset-1 ring-offset-background"
                    : ""
                }`}
                onClick={(event) =>
                  openWeekDetail(weekIndex, event.currentTarget)
                }
              />
            );
          })}
        </div>
      </div>

      {activeDetail && anchorRect && (
        <WeekDetailOverlay
          detail={activeDetail}
          anchorRect={anchorRect}
          locale={locale}
          onClose={closeOverlay}
          t={t}
        />
      )}
    </div>
  );
}
