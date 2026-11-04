"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { JournalExportMenuItems } from "./journal-export-menu-items"
import {
  formatJournalDayPnl,
  journalCalendarDayModifiers,
  journalDayPnlTone,
  journalMobileDateLabel,
} from "@/lib/journal/journal-mobile-date"
import { cn } from "@/lib/utils"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { enUS, fr } from "date-fns/locale"
import { CalendarIcon, ChevronDown, MoreHorizontal } from "lucide-react"
import { useMemo, useState } from "react"

interface JournalMobileHeaderProps {
  date: Date
  tradeCount: number
  dayPnl: number
  calendarData: Record<string, { pnl: number; tradeNumber?: number } | undefined>
  pane: "journal" | "summary"
  isExporting: boolean
  onPaneChange: (pane: "journal" | "summary") => void
  onDateChange: (date: Date) => void
  onExportPdf: () => void
  onExportDocx: () => void
}

export function JournalMobileHeader({
  date,
  tradeCount,
  dayPnl,
  calendarData,
  pane,
  isExporting,
  onPaneChange,
  onDateChange,
  onExportPdf,
  onExportDocx,
}: JournalMobileHeaderProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLocale = locale === "fr" ? fr : enUS
  const [dateOpen, setDateOpen] = useState(false)
  const [month, setMonth] = useState(date)
  const dateLabel = journalMobileDateLabel(date, locale)
  const { green, red, flat } = useMemo(
    () => journalCalendarDayModifiers(calendarData),
    [calendarData],
  )

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h2 className="min-w-0 flex-1 text-base font-semibold">
          {t("mindset.shortTitle")}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              aria-label={t("mindset.moreActions")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-60">
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {t("mindset.description")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <JournalExportMenuItems
              isExporting={isExporting}
              onExportPdf={onExportPdf}
              onExportDocx={onExportDocx}
            />
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={pane}
              onValueChange={(next) => {
                if (next === "journal" || next === "summary") {
                  onPaneChange(next)
                }
              }}
            >
              <DropdownMenuRadioItem value="journal">
                {t("mindset.panes.journal")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="summary">
                {t("mindset.panes.summary")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-1.5 flex items-center gap-2 whitespace-nowrap">
        <Popover
          open={dateOpen}
          onOpenChange={(open) => {
            setDateOpen(open)
            if (open) {
              setMonth(date)
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium shadow-none"
              aria-label={t("mindset.selectDate")}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{dateLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              month={month}
              defaultMonth={date}
              onMonthChange={setMonth}
              onSelect={(next) => {
                if (!next) {
                  return
                }
                onDateChange(next)
                setDateOpen(false)
              }}
              locale={dateLocale}
              weekStartsOn={1}
              modifiers={{ green, red, flat }}
              modifiersClassNames={{
                green:
                  "rounded-md bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 aria-selected:bg-primary aria-selected:text-primary-foreground",
                red: "rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 aria-selected:bg-primary aria-selected:text-primary-foreground",
                flat: "rounded-md bg-muted text-muted-foreground ring-1 ring-inset ring-border aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:ring-0",
              }}
            />
          </PopoverContent>
        </Popover>
        <DayStatus tradeCount={tradeCount} dayPnl={dayPnl} locale={locale} />
      </div>
    </div>
  )
}

function DayStatus({
  tradeCount,
  dayPnl,
  locale,
}: {
  tradeCount: number
  dayPnl: number
  locale: "en" | "fr"
}) {
  const t = useI18n()
  if (tradeCount === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("mindset.header.noTrades")}
      </span>
    )
  }

  const tone = journalDayPnlTone(dayPnl)
  const tradeLabel =
    tradeCount === 1 ? t("calendar.trade") : t("calendar.trades")

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap",
        tone === "positive" &&
          "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
        tone === "negative" &&
          "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
        tone === "flat" && "border bg-muted text-muted-foreground",
      )}
    >
      {formatJournalDayPnl(dayPnl, locale)}
      <span className="hidden font-normal opacity-70 min-[360px]:inline">
        · {tradeCount} {tradeLabel}
      </span>
    </span>
  )
}
