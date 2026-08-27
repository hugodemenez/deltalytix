"use client"

import { useId, type ReactNode } from "react"
import { getMonth, getYear } from "date-fns"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  CALENDAR_MONTH_KEYS,
  dateFromMonthYear,
  getCalendarPickerYears,
} from "./calendar-month-year-picker-model"

function translateCalendarMonth(
  t: ReturnType<typeof useI18n>,
  monthIndex: number,
): string {
  switch (monthIndex) {
    case 1:
      return t("calendar.months.february")
    case 2:
      return t("calendar.months.march")
    case 3:
      return t("calendar.months.april")
    case 4:
      return t("calendar.months.may")
    case 5:
      return t("calendar.months.june")
    case 6:
      return t("calendar.months.july")
    case 7:
      return t("calendar.months.august")
    case 8:
      return t("calendar.months.september")
    case 9:
      return t("calendar.months.october")
    case 10:
      return t("calendar.months.november")
    case 11:
      return t("calendar.months.december")
    default:
      return t("calendar.months.january")
  }
}

/** Same chrome as navbar view / filter / account controls. */
const navbarSelectButtonClassName = cn(
  "relative isolate inline-flex h-7 shrink-0 items-center gap-1 overflow-hidden rounded-[4px]",
  "border border-[#E5E5E5] bg-white px-2",
  "text-[13px] font-medium text-[#171717]",
  "transition-colors hover:bg-[#FAFAFA]",
  "focus-within:outline-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  "dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40",
)

function NativeTitleSelect({
  id,
  label,
  name,
  value,
  displayValue,
  onChange,
  children,
}: {
  id: string
  label: string
  name: string
  value: string
  displayValue: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className={navbarSelectButtonClassName}>
        <span aria-hidden="true" className="capitalize whitespace-nowrap">
          {displayValue}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[#686D67] dark:text-muted-foreground"
          strokeWidth={1.75}
        />
        <select
          id={id}
          name={name}
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 z-10 cursor-pointer opacity-0 text-base"
        >
          {children}
        </select>
      </div>
    </div>
  )
}

export function CalendarMonthYearPicker({
  date,
  viewMode,
  onDateChange,
  className,
}: {
  date: Date
  viewMode: "daily" | "weekly"
  onDateChange: (date: Date) => void
  className?: string
}) {
  const t = useI18n()
  const baseId = useId()
  const monthId = `${baseId}-month`
  const yearId = `${baseId}-year`

  const monthIndex = getMonth(date)
  const year = getYear(date)
  const years = getCalendarPickerYears(new Date(), year)
  const monthLabel = translateCalendarMonth(t, monthIndex)
  const groupLabel =
    viewMode === "daily" ? `${monthLabel} ${year}` : String(year)

  return (
    <div
      role="group"
      aria-label={groupLabel}
      data-slot="calendar-month-year-picker"
      className={cn("inline-flex min-w-0 items-center gap-1", className)}
    >
      {viewMode === "daily" && (
        <NativeTitleSelect
          id={monthId}
          name="calendar-month"
          label={t("calendar.monthYearPicker.month")}
          value={String(monthIndex)}
          displayValue={monthLabel}
          onChange={(value) => {
            onDateChange(dateFromMonthYear(year, Number(value)))
          }}
        >
          {CALENDAR_MONTH_KEYS.map((key, index) => (
            <option key={key} value={index}>
              {translateCalendarMonth(t, index)}
            </option>
          ))}
        </NativeTitleSelect>
      )}
      <NativeTitleSelect
        id={yearId}
        name="calendar-year"
        label={t("calendar.monthYearPicker.year")}
        value={String(year)}
        displayValue={String(year)}
        onChange={(value) => {
          onDateChange(
            dateFromMonthYear(
              Number(value),
              viewMode === "weekly" ? 0 : monthIndex,
            ),
          )
        }}
      >
        {years.map((optionYear) => (
          <option key={optionYear} value={optionYear}>
            {optionYear}
          </option>
        ))}
      </NativeTitleSelect>
    </div>
  )
}
