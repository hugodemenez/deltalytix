import { format } from "date-fns"
import { enUS, fr } from "date-fns/locale"

const MINUS_SIGN = "\u2212"
const PLUS_MINUS_SIGN = "\u00B1"

export type JournalDayPnlTone = "positive" | "negative" | "flat"

export function capitalizeFirst(value: string): string {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function journalMobileDateLabel(
  date: Date,
  locale: "en" | "fr",
): string {
  return capitalizeFirst(
    format(date, "EEEE d MMMM", { locale: locale === "fr" ? fr : enUS }),
  )
}

export function journalMobileDateLine(
  date: Date,
  tradeCount: number,
  locale: "en" | "fr",
  labels: { none: string; one: string; many: (count: number) => string },
): string {
  const tradeLabel =
    tradeCount === 0
      ? labels.none
      : tradeCount === 1
        ? labels.one
        : labels.many(tradeCount)
  return `${journalMobileDateLabel(date, locale)} · ${tradeLabel}`
}

export function journalDayPnlTone(net: number): JournalDayPnlTone {
  if (Math.abs(net) < 0.5) {
    return "flat"
  }
  return net > 0 ? "positive" : "negative"
}

const LOCAL_DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseJournalCalendarDateKey(key: string): Date | null {
  const match = LOCAL_DATE_KEY.exec(key)
  if (!match) {
    return null
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export type JournalCalendarModifiers = {
  green: Date[]
  red: Date[]
  flat: Date[]
}

export function journalCalendarDayModifiers(
  calendarData: Record<string, { pnl: number; tradeNumber?: number } | undefined>,
): JournalCalendarModifiers {
  const green: Date[] = []
  const red: Date[] = []
  const flat: Date[] = []

  for (const [key, day] of Object.entries(calendarData)) {
    if (!day || (day.tradeNumber ?? 0) < 1) {
      continue
    }
    const date = parseJournalCalendarDateKey(key)
    if (!date) {
      continue
    }
    if (day.pnl > 0) {
      green.push(date)
    } else if (day.pnl < 0) {
      red.push(date)
    } else {
      flat.push(date)
    }
  }

  return { green, red, flat }
}

export function formatJournalDayPnl(
  net: number,
  locale: "en" | "fr",
): string {
  const rounded = Math.round(net)
  const amount = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: locale === "fr" ? "EUR" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded))
  if (rounded > 0) {
    return `+${amount}`
  }
  if (rounded < 0) {
    return `${MINUS_SIGN}${amount}`
  }
  return `${PLUS_MINUS_SIGN}${amount}`
}
