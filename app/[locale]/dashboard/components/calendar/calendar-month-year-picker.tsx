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

const nativeSelectClassName = cn(
  "col-start-1 row-start-1 w-full min-w-0 appearance-none bg-transparent",
  "cursor-pointer border-0 p-0 m-0 capitalize",
  "text-base leading-none font-semibold tracking-tight sm:text-lg",
  "min-h-11 sm:min-h-10",
  "rounded-sm text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
      <div className="inline-grid items-center">
        <span
          aria-hidden="true"
          className="col-start-1 row-start-1 invisible whitespace-pre px-0.5 text-base leading-none font-semibold capitalize sm:text-lg"
        >
          {displayValue}
        </span>
        <select
          id={id}
          name={name}
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          className={nativeSelectClassName}
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
      className={cn(
        "inline-flex min-w-0 items-center gap-1 rounded-sm px-1 -mx-1",
        "text-base font-semibold sm:text-lg",
        "transition-colors hover:bg-muted/50 motion-reduce:transition-none",
        className,
      )}
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
      <ChevronDown
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground sm:size-4"
      />
    </div>
  )
}
