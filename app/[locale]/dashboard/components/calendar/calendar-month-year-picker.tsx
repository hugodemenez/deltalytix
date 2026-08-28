"use client"

import { useId, type ReactNode } from "react"
import { getMonth, getYear } from "date-fns"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { safeTranslate } from "@/lib/translation-utils"
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
  const key = CALENDAR_MONTH_KEYS[monthIndex] ?? CALENDAR_MONTH_KEYS[0]
  // Dynamic month keys widen to a union next-international can't represent.
  return safeTranslate(t, key)
}

/** Overlay that keeps the native <select> clickable without painting over the label. */
export const nativeCalendarSelectOverlayClassName = cn(
  "absolute inset-0 z-10 size-full cursor-pointer text-base",
  // Edge (and Chromium dark color-scheme) still paints a system <select>
  // when only opacity-0 is set, covering the custom label until hover.
  "appearance-none border-0 bg-transparent p-0 shadow-none outline-hidden",
  "text-transparent [-webkit-text-fill-color:transparent]",
  "[color-scheme:only_light] [forced-color-adjust:none] opacity-0",
)

/** Same chrome as navbar view / filter / account controls. */
const navbarButtonClassName = cn(
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
  sizerValues,
  slot,
  className,
}: {
  id: string
  label: string
  name: string
  value: string
  displayValue: string
  onChange: (value: string) => void
  children: ReactNode
  sizerValues?: readonly string[]
  slot?: string
  className?: string
}) {
  const widthSources = sizerValues?.length ? sizerValues : [displayValue]

  return (
    <div
      data-slot={slot}
      className={cn(navbarButtonClassName, className)}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="inline-grid items-center justify-items-center">
        {widthSources.map((source, index) => (
          <span
            key={`${index}-${source}`}
            aria-hidden="true"
            className="col-start-1 row-start-1 invisible capitalize whitespace-nowrap"
          >
            {source}
          </span>
        ))}
        <span aria-hidden="true" className="col-start-1 row-start-1 capitalize whitespace-nowrap">
          {displayValue}
        </span>
      </div>
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
        className={nativeCalendarSelectOverlayClassName}
      >
        {children}
      </select>
    </div>
  )
}

export function CalendarMonthYearPicker({
  date,
  viewMode,
  onDateChange,
  className,
  monthNav,
}: {
  date: Date
  viewMode: "daily" | "weekly"
  onDateChange: (date: Date) => void
  className?: string
  monthNav?: {
    prev: ReactNode
    next: ReactNode
  }
}) {
  const t = useI18n()
  const baseId = useId()
  const monthId = `${baseId}-month`
  const yearId = `${baseId}-year`

  const monthIndex = getMonth(date)
  const year = getYear(date)
  const years = getCalendarPickerYears(new Date(), year)
  const monthLabel = translateCalendarMonth(t, monthIndex)
  const monthLabels = CALENDAR_MONTH_KEYS.map((_, index) =>
    translateCalendarMonth(t, index),
  )
  const groupLabel =
    viewMode === "daily" ? `${monthLabel} ${year}` : String(year)

  return (
    <div
      role="group"
      aria-label={groupLabel}
      data-slot="calendar-month-year-picker"
      className={cn("inline-flex items-center gap-1.5 sm:gap-2", className)}
    >
      {monthNav?.prev}
      {viewMode === "daily" && (
        <NativeTitleSelect
          id={monthId}
          name="calendar-month"
          label={t("calendar.monthYearPicker.month")}
          value={String(monthIndex)}
          displayValue={monthLabel}
          sizerValues={monthLabels}
          slot="calendar-month-select"
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
      {viewMode === "daily" && monthNav?.next}
      <NativeTitleSelect
        id={yearId}
        name="calendar-year"
        label={t("calendar.monthYearPicker.year")}
        value={String(year)}
        displayValue={String(year)}
        slot="calendar-year-select"
        className="tabular-nums"
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
      {viewMode === "weekly" && monthNav?.next}
    </div>
  )
}
