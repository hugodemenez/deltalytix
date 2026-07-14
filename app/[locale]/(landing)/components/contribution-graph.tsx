"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  GitCommitHorizontal,
  Minus,
  Plus,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useCurrentLocale, useI18n } from "@/locales/landing-client";
import {
  type ContributionGraphData,
  type WeekDetail,
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

export interface ContributionChangelogEntry {
  slug: string;
  title: string;
  date: string;
}

interface MonthActivity {
  month: number;
  commits: number;
  additions: number;
  deletions: number;
  hasCodeFrequency: boolean;
  isVisible: boolean;
  level: number;
  weekLevels: number[];
  changelogEntries: ContributionChangelogEntry[];
}

function isDateInWeek(date: string, detail: WeekDetail) {
  return date >= detail.weekStart && date <= detail.weekEnd;
}

function getWeekChangelogEntries(
  detail: WeekDetail,
  changelogEntries: ContributionChangelogEntry[],
) {
  return changelogEntries.filter((entry) => isDateInWeek(entry.date, detail));
}

function getDetailMonth(detail: WeekDetail, year: number) {
  const midpoint = new Date(`${detail.weekStart}T12:00:00`);
  midpoint.setDate(midpoint.getDate() + 3);

  if (midpoint.getFullYear() < year) return 0;
  if (midpoint.getFullYear() > year) return 11;
  return midpoint.getMonth();
}

function buildMonthActivities(
  year: number,
  yearData: ContributionGraphData["years"][number],
  changelogEntries: ContributionChangelogEntry[],
): MonthActivity[] {
  const months = Array.from({ length: 12 }, (_, month) => ({
    month,
    commits: 0,
    additions: 0,
    deletions: 0,
    hasCodeFrequency: false,
    isVisible: false,
    level: 0,
    weekLevels: [],
    changelogEntries: changelogEntries.filter((entry) => {
      const date = new Date(`${entry.date}T12:00:00`);
      return date.getFullYear() === year && date.getMonth() === month;
    }),
  }));

  yearData.weekDetails.forEach((detail, weekIndex) => {
    const month = getDetailMonth(detail, year);
    const activity = months[month];
    const isVisible = weekIndex < yearData.visibleWeekCount;
    activity.weekLevels.push(isVisible ? yearData.levels[weekIndex] : -1);

    if (!isVisible) return;

    activity.isVisible = true;

    detail.days.forEach((day) => {
      const date = new Date(`${day.date}T12:00:00`);
      if (date.getFullYear() === year) {
        months[date.getMonth()].commits += day.count;
      }
    });

    if (detail.additions !== null && detail.deletions !== null) {
      activity.additions += detail.additions;
      activity.deletions += detail.deletions;
      activity.hasCodeFrequency = true;
    }
  });

  const maxCommits = Math.max(...months.map((month) => month.commits), 0);
  months.forEach((month) => {
    if (month.commits === 0 || maxCommits === 0) month.level = 0;
    else if (month.commits / maxCommits <= 0.25) month.level = 1;
    else if (month.commits / maxCommits <= 0.5) month.level = 2;
    else if (month.commits / maxCommits <= 0.75) month.level = 3;
    else month.level = 4;
  });

  return months;
}

function CodeChangeSummary({
  additions,
  deletions,
  available,
  locale,
  compact = false,
}: {
  additions: number;
  deletions: number;
  available: boolean;
  locale: string;
  compact?: boolean;
}) {
  const t = useI18n();
  const formatter = new Intl.NumberFormat(locale, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  });

  if (!available) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("landing.openSource.contributionGraph.linesUnavailable")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-md bg-emerald-500/8 px-2.5 py-2 dark:bg-emerald-400/10">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Plus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          {t("landing.openSource.contributionGraph.added")}
        </span>
        <strong className="mt-0.5 block text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {formatter.format(additions)}
        </strong>
      </div>
      <div className="rounded-md bg-rose-500/8 px-2.5 py-2 dark:bg-rose-400/10">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Minus className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          {t("landing.openSource.contributionGraph.deleted")}
        </span>
        <strong className="mt-0.5 block text-sm font-medium text-rose-700 dark:text-rose-300">
          {formatter.format(deletions)}
        </strong>
      </div>
    </div>
  );
}

function ChangelogLinks({
  entries,
  locale,
  className = "",
}: {
  entries: ContributionChangelogEntry[];
  locale: string;
  className?: string;
}) {
  const t = useI18n();

  if (entries.length === 0) {
    return (
      <Link
        href={`/${locale}/updates`}
        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        {t("landing.openSource.contributionGraph.browseChangelog")}
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <ul
      className={`overscroll-contain scroll-smooth pr-1 [scrollbar-gutter:stable] ${className}`}
    >
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link
            href={`/${locale}/updates/${entry.slug}`}
            className="group/link flex items-start justify-between gap-3 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <span className="leading-snug">{entry.title}</span>
            <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/link:transform-none" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function WeekHoverDetail({
  detail,
  changelogEntries,
  locale,
}: {
  detail: WeekDetail;
  changelogEntries: ContributionChangelogEntry[];
  locale: string;
}) {
  const t = useI18n();
  const entries = getWeekChangelogEntries(detail, changelogEntries);
  const commitLabel =
    detail.count === 1
      ? t("landing.openSource.contributionGraph.oneCommit")
      : t("landing.openSource.contributionGraph.nCommits", {
          count: detail.count,
        });

  return (
    <div className="flex max-h-[min(28rem,calc(100dvh-1.5rem))] flex-col">
      <div className="border-b border-border px-3.5 py-3">
        <p className="text-xs font-medium text-foreground">
          {formatWeekRange(detail, locale)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <GitCommitHorizontal className="h-3.5 w-3.5" />
          {commitLabel}
        </p>
      </div>
      <div className="min-h-0 space-y-3 p-3.5">
        <CodeChangeSummary
          additions={detail.additions ?? 0}
          deletions={detail.deletions ?? 0}
          available={detail.additions !== null && detail.deletions !== null}
          locale={locale}
          compact
        />
        <div className="min-h-0">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("landing.openSource.contributionGraph.productUpdates")}
          </p>
          <ChangelogLinks
            entries={entries}
            locale={locale}
            className="max-h-52 space-y-1.5 overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
}

function WeekActivityBar({
  detail,
  level,
  weekNumber,
  changelogEntries,
  locale,
}: {
  detail: WeekDetail;
  level: number;
  weekNumber: number;
  changelogEntries: ContributionChangelogEntry[];
  locale: string;
}) {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  const openCard = () => {
    clearCloseTimeout();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => setOpen(false), 80);
  };

  useEffect(() => () => clearCloseTimeout(), []);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={80} closeDelay={50}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={t("landing.openSource.contributionGraph.weekAria", {
            week: weekNumber,
            count: detail.count,
          })}
          onMouseEnter={openCard}
          onMouseMove={openCard}
          onMouseLeave={scheduleClose}
          onFocus={openCard}
          onBlur={scheduleClose}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className={`contribution-week-bar h-4 flex-1 basis-0 rounded-[2px] outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${LEVEL_COLORS[level]}`}
        />
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        sideOffset={10}
        collisionPadding={12}
        onMouseEnter={openCard}
        onMouseLeave={scheduleClose}
        onFocusCapture={openCard}
        onBlurCapture={scheduleClose}
        className="w-72 origin-(--radix-hover-card-content-transform-origin) overflow-hidden p-0 duration-150 motion-reduce:animate-none"
      >
        <WeekHoverDetail
          detail={detail}
          changelogEntries={changelogEntries}
          locale={locale}
        />
      </HoverCardContent>
    </HoverCard>
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
    <div className="relative mb-2 h-4 w-full overflow-visible">
      {monthLabels.map(({ weekIndex, month }) => (
        <span
          key={`${weekIndex}-${month}`}
          className="absolute top-0 whitespace-nowrap text-[11px] font-medium leading-none text-foreground/70"
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

function MobileMonthGrid({
  months,
  year,
  locale,
  onSelect,
}: {
  months: MonthActivity[];
  year: number;
  locale: string;
  onSelect: (month: number) => void;
}) {
  const t = useI18n();

  return (
    <div className="md:hidden">
      <p className="mb-2 text-xs text-muted-foreground">
        {t("landing.openSource.contributionGraph.tapMonth")}
      </p>
      <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
          {months.map((activity) => {
            const updates = activity.changelogEntries.length;
            return (
              <button
                key={activity.month}
                type="button"
                disabled={!activity.isVisible}
                onClick={() => onSelect(activity.month)}
                className="min-h-14 w-[72px] touch-manipulation rounded-md px-1.5 py-2 text-left outline-none transition-[transform,background-color] duration-150 hover:bg-muted/60 active:scale-[0.97] active:bg-muted disabled:pointer-events-none disabled:opacity-35 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:transform-none"
                aria-label={t(
                  "landing.openSource.contributionGraph.monthAria",
                  {
                    month: formatMonthLabel(activity.month, locale),
                    year,
                    count: activity.commits,
                    updates,
                  },
                )}
              >
                <span className="block text-[11px] font-medium text-foreground/75">
                  {formatMonthLabel(activity.month, locale)}
                </span>
                <span className="mt-2 flex gap-1" aria-hidden>
                  {activity.weekLevels.map((level, weekIndex) => (
                    <span
                      key={weekIndex}
                      className={`h-3 w-2.5 rounded-[2px] ${
                        level === -1
                          ? UPCOMING_WEEK_COLOR
                          : LEVEL_COLORS[level]
                      }`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthDetailSheet({
  activity,
  year,
  locale,
  onOpenChange,
}: {
  activity: MonthActivity | null;
  year: number;
  locale: string;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const updateCount = activity?.changelogEntries.length ?? 0;

  return (
    <Sheet open={activity !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl border-border bg-background p-0 pb-[max(1rem,env(safe-area-inset-bottom))] data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none motion-reduce:transition-none [&>button:last-child]:hidden"
      >
        {activity && (
          <div className="mx-auto w-full max-w-lg px-1">
            <SheetHeader className="relative border-b border-border px-5 pb-4 pt-5 text-left">
              <SheetTitle className="pr-10 text-base">
                {t("landing.openSource.contributionGraph.monthDetails", {
                  month: formatMonthLabel(activity.month, locale),
                  year,
                })}
              </SheetTitle>
              <SheetDescription>
                {t("landing.openSource.contributionGraph.monthSummary", {
                  count: activity.commits,
                  updates: updateCount,
                })}
              </SheetDescription>
              <SheetClose asChild>
                <button
                  type="button"
                  className="absolute right-3 top-2 inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground outline-none transition-[transform,background-color,color] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:transform-none"
                  aria-label={t(
                    "landing.openSource.contributionGraph.closeMonthDetails",
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </SheetHeader>
            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("landing.openSource.contributionGraph.codeChanges")}
                </p>
                <CodeChangeSummary
                  additions={activity.additions}
                  deletions={activity.deletions}
                  available={activity.hasCodeFrequency}
                  locale={locale}
                />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("landing.openSource.contributionGraph.productUpdates")}
                </p>
                <ChangelogLinks
                  entries={activity.changelogEntries}
                  locale={locale}
                  className="max-h-[min(42dvh,22rem)] space-y-1.5 overflow-y-auto touch-pan-y"
                />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function ContributionGraph({
  data,
  changelogEntries,
}: {
  data: ContributionGraphData;
  changelogEntries: ContributionChangelogEntry[];
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const minYear = data.availableYears[0] ?? data.defaultYear;
  const maxYear =
    data.availableYears[data.availableYears.length - 1] ?? data.defaultYear;
  const [year, setYear] = useState(data.defaultYear);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const yearData = data.years[year];
  const months = useMemo(
    () =>
      yearData
        ? buildMonthActivities(year, yearData, changelogEntries)
        : [],
    [changelogEntries, year, yearData],
  );

  if (!yearData) return null;

  const canGoBack = year > minYear;
  const canGoForward = year < maxYear;
  const activeMonthActivity =
    activeMonth !== null ? (months[activeMonth] ?? null) : null;

  const changeYear = (nextYear: number) => {
    setActiveMonth(null);
    setYear(nextYear);
  };

  return (
    <div className="relative w-full min-w-0 select-none">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => changeYear(year - 1)}
          disabled={!canGoBack}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground outline-none transition-[transform,background-color,color] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:transform-none"
          aria-label={t("landing.openSource.contributionGraph.previousYear")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <span className="block text-sm font-medium text-foreground">
            {year}
          </span>
          <span className="block text-[11px] text-muted-foreground md:hidden">
            {t("landing.openSource.contributionGraph.monthlyActivity")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => changeYear(year + 1)}
          disabled={!canGoForward}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground outline-none transition-[transform,background-color,color] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:transform-none"
          aria-label={t("landing.openSource.contributionGraph.nextYear")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <MobileMonthGrid
        months={months}
        year={year}
        locale={locale}
        onSelect={setActiveMonth}
      />

      <div className="hidden w-full overflow-visible md:block">
        <MonthAxis
          weekCount={yearData.weekCount}
          monthLabels={yearData.monthLabels}
          locale={locale}
        />

        <div
          className="flex h-7 w-full items-end gap-px"
          role="group"
          aria-label={t("landing.openSource.contributionGraph.commitsInYear", {
            count: yearData.totalContributions.toLocaleString(locale),
            year,
          })}
        >
          {yearData.levels.map((level, weekIndex) => {
            const isPastOrCurrent = weekIndex < yearData.visibleWeekCount;

            if (!isPastOrCurrent) {
              return (
                <div
                  key={weekIndex}
                  className={`h-4 flex-1 basis-0 rounded-[2px] ${UPCOMING_WEEK_COLOR}`}
                  aria-hidden
                />
              );
            }

            const detail = yearData.weekDetails[weekIndex];
            return (
              <WeekActivityBar
                key={weekIndex}
                detail={detail}
                level={level}
                weekNumber={weekIndex + 1}
                changelogEntries={changelogEntries}
                locale={locale}
              />
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("landing.openSource.contributionGraph.hoverWeek")}
        </p>
      </div>

      <MonthDetailSheet
        activity={activeMonthActivity}
        year={year}
        locale={locale}
        onOpenChange={(open) => {
          if (!open) setActiveMonth(null);
        }}
      />
    </div>
  );
}
