"use client"

import { useState } from "react"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandItem } from "@/components/ui/command"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useParams } from "next/navigation"
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface DateRangeSectionProps {
  searchValue: string
}

const PICKER_START_MONTH = new Date(2000, 0)
const PICKER_END_MONTH = new Date(new Date().getFullYear() + 2, 11)

function DatePickerCalendar({
  selected,
  onSelect,
  month,
  onMonthChange,
  locale,
}: {
  selected?: Date
  onSelect: (date: Date | undefined) => void
  month?: Date
  onMonthChange: (month: Date) => void
  locale?: typeof fr
}) {
  return (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      startMonth={PICKER_START_MONTH}
      endMonth={PICKER_END_MONTH}
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={onSelect}
      locale={locale}
      autoFocus
    />
  )
}

function DateFilterRow({
  open,
  onOpenChange,
  label,
  formattedValue,
  selected,
  month,
  onMonthChange,
  onSelect,
  onClear,
  locale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  formattedValue?: string
  selected?: Date
  month: Date
  onMonthChange: (month: Date) => void
  onSelect: (date: Date | undefined) => void
  onClear: () => void
  locale?: typeof fr
}) {
  const t = useI18n()

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverAnchor asChild>
        <CommandItem
          onSelect={() => {
            onMonthChange(selected ?? new Date())
            onOpenChange(!open)
          }}
          className="group flex items-center gap-2 px-2"
        >
          <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">{label}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span
              className={cn(
                "min-w-[100px] text-right text-xs tabular-nums text-muted-foreground",
                !formattedValue && "invisible"
              )}
            >
              {formattedValue || "\u00A0"}
            </span>
            {formattedValue ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={t("filters.clearDate")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                  onClear()
                }}
              >
                <X className="h-3 w-3 text-destructive" aria-hidden="true" />
              </Button>
            ) : null}
          </span>
        </CommandItem>
      </PopoverAnchor>
      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align="start"
        side="right"
        sideOffset={8}
        collisionPadding={8}
        aria-label={label}
        data-slot="popover-content"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DatePickerCalendar
          selected={selected}
          month={month}
          onMonthChange={onMonthChange}
          locale={locale}
          onSelect={(date) => {
            onSelect(date)
            onOpenChange(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateRangeSection({ searchValue }: DateRangeSectionProps) {
  const { dateRange, setDateRange, weekdayFilter, setWeekdayFilter } = useData()
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false)
  const [toCalendarOpen, setToCalendarOpen] = useState(false)
  const [uniqueDayCalendarOpen, setUniqueDayCalendarOpen] = useState(false)
  const [fromCalendarMonth, setFromCalendarMonth] = useState<Date>(
    dateRange?.from ?? new Date()
  )
  const [toCalendarMonth, setToCalendarMonth] = useState<Date>(
    dateRange?.to ?? dateRange?.from ?? new Date()
  )
  const [uniqueDayCalendarMonth, setUniqueDayCalendarMonth] = useState<Date>(
    dateRange?.from ?? dateRange?.to ?? new Date()
  )

  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const dateLocale = locale === "fr" ? fr : undefined

  const formatDate = (date: Date) =>
    format(date, "LLL dd, y", { locale: dateLocale })

  const quickSelectors = [
    {
      label: t("filters.thisWeek"),
      getRange: () => ({
        from: startOfWeek(new Date()),
        to: endOfWeek(new Date()),
      }),
    },
    {
      label: t("filters.thisMonth"),
      getRange: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: t("filters.lastThreeMonths"),
      getRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
    },
    {
      label: t("filters.lastSixMonths"),
      getRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }),
    },
  ]

  const filteredQuickSelectors = searchValue
    ? quickSelectors.filter((selector) =>
        selector.label.toLowerCase().includes(searchValue.toLowerCase())
      )
    : quickSelectors

  const fromLabel = t("filters.commandMenu.dateRange.from")
  const toLabel = t("filters.commandMenu.dateRange.to")
  const uniqueDayLabel = t("filters.uniqueDay")
  const showFrom =
    !searchValue || fromLabel.toLowerCase().includes(searchValue.toLowerCase())
  const showTo =
    !searchValue || toLabel.toLowerCase().includes(searchValue.toLowerCase())
  const showUniqueDay =
    !searchValue ||
    uniqueDayLabel.toLowerCase().includes(searchValue.toLowerCase())

  const getWeekdayName = (day: number): string => {
    const weekdayNames = [
      t("weekdayPnl.days.sunday"),
      t("weekdayPnl.days.monday"),
      t("weekdayPnl.days.tuesday"),
      t("weekdayPnl.days.wednesday"),
      t("weekdayPnl.days.thursday"),
      t("weekdayPnl.days.friday"),
      t("weekdayPnl.days.saturday"),
    ]
    return weekdayNames[day] || ""
  }

  const showWeekdayFilter = Boolean(weekdayFilter?.days?.length)

  const formatWeekdayFilter = () => {
    if (!weekdayFilter?.days?.length) return ""
    if (weekdayFilter.days.length === 1) {
      return getWeekdayName(weekdayFilter.days[0])
    }
    return [...weekdayFilter.days]
      .sort((a, b) => a - b)
      .map((day) => getWeekdayName(day))
      .join(", ")
  }

  const uniqueDaySelected =
    dateRange?.from &&
    dateRange?.to &&
    dateRange.from.getTime() === dateRange.to.getTime()
      ? dateRange.from
      : undefined

  return (
    <>
      {showWeekdayFilter ? (
        <CommandItem
          onSelect={() => setWeekdayFilter({ days: [] })}
          className="group flex items-center gap-2 px-2"
        >
          <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">
            {t("filters.commandMenu.dateRange.weekdayFilter")}:{" "}
            {formatWeekdayFilter()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={t("filters.clearDate")}
            onClick={(event) => {
              event.stopPropagation()
              event.preventDefault()
              setWeekdayFilter({ days: [] })
            }}
          >
            <X className="h-3 w-3 text-destructive" aria-hidden="true" />
          </Button>
        </CommandItem>
      ) : null}

      {showFrom ? (
        <DateFilterRow
          open={fromCalendarOpen}
          onOpenChange={setFromCalendarOpen}
          label={fromLabel}
          formattedValue={dateRange?.from ? formatDate(dateRange.from) : undefined}
          selected={dateRange?.from}
          month={fromCalendarMonth}
          onMonthChange={setFromCalendarMonth}
          locale={dateLocale}
          onSelect={(date) => {
            if (date) setDateRange({ from: date, to: dateRange?.to })
          }}
          onClear={() => setDateRange({ from: undefined, to: dateRange?.to })}
        />
      ) : null}

      {showTo ? (
        <DateFilterRow
          open={toCalendarOpen}
          onOpenChange={setToCalendarOpen}
          label={toLabel}
          formattedValue={dateRange?.to ? formatDate(dateRange.to) : undefined}
          selected={dateRange?.to}
          month={toCalendarMonth}
          onMonthChange={setToCalendarMonth}
          locale={dateLocale}
          onSelect={(date) => {
            if (date) setDateRange({ from: dateRange?.from, to: date })
          }}
          onClear={() => setDateRange({ from: dateRange?.from, to: undefined })}
        />
      ) : null}

      {showUniqueDay ? (
        <DateFilterRow
          open={uniqueDayCalendarOpen}
          onOpenChange={setUniqueDayCalendarOpen}
          label={uniqueDayLabel}
          formattedValue={
            uniqueDaySelected ? formatDate(uniqueDaySelected) : undefined
          }
          selected={uniqueDaySelected}
          month={uniqueDayCalendarMonth}
          onMonthChange={setUniqueDayCalendarMonth}
          locale={dateLocale}
          onSelect={(date) => {
            if (date) setDateRange({ from: date, to: date })
          }}
          onClear={() => setDateRange({ from: undefined, to: undefined })}
        />
      ) : null}

      {filteredQuickSelectors.map((selector) => (
        <CommandItem
          key={selector.label}
          onSelect={() => setDateRange(selector.getRange())}
          className="px-2"
        >
          <span className="text-sm">{selector.label}</span>
        </CommandItem>
      ))}
    </>
  )
}
