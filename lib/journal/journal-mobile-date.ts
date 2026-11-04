import { format } from "date-fns"
import { enUS, fr } from "date-fns/locale"

export function capitalizeFirst(value: string): string {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function journalMobileDateLine(
  date: Date,
  tradeCount: number,
  locale: "en" | "fr",
  labels: { none: string; one: string; many: (count: number) => string },
): string {
  const formatted = capitalizeFirst(
    format(date, "EEEE d MMMM", { locale: locale === "fr" ? fr : enUS }),
  )
  const tradeLabel =
    tradeCount === 0
      ? labels.none
      : tradeCount === 1
        ? labels.one
        : labels.many(tradeCount)
  return `${formatted} · ${tradeLabel}`
}
