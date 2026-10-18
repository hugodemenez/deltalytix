/**
 * Single write-boundary normalizer for `Trade.entryDate` / `Trade.closeDate`.
 *
 * Both columns are `String`, and `/api/v1/trades`, the calendar, and the
 * `(userId, entryDate)` index all compare them lexicographically. That only
 * works when every row uses the same UTC shape, so everything written to the
 * table goes through here first.
 *
 * Canonical form: `YYYY-MM-DDTHH:mm:ss.sss+00:00` — what
 * `formatTimestamp(date.toISOString())` produces, and what the large majority
 * of recent rows already use.
 *
 * Accepted input (anything else returns `null`):
 * - ISO 8601 date-times with `Z` or a numeric offset (`+02:00`, `-0600`, `+01`).
 * - ISO-like date-times with no zone (`2025-01-06T09:27:44`,
 *   `2024-01-14 22:10:37`, `2025-02-18 3:02:06`), read as UTC — the zone every
 *   server-side importer already assumed.
 * - Bare dates (`2026-01-13`), read as UTC midnight.
 * - `Date` objects.
 *
 * Slash dates (`02/18/2025`, `21/03/2025`) are rejected on purpose: mm/dd vs
 * dd/mm cannot be told apart from one value, so each importer has to parse
 * its own format before the trade reaches the database.
 */

export const CANONICAL_TRADE_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00$/

/** Trades before 1970 or after 2100 are parser bugs (seen: years 0000, 0142, +040442). */
const MIN_YEAR = 1970
const MAX_YEAR = 2100

const ISO_LIKE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i

function canonicalFromMs(ms: number): string | null {
  if (!Number.isFinite(ms)) return null
  const date = new Date(ms)
  const year = date.getUTCFullYear()
  if (year < MIN_YEAR || year > MAX_YEAR) return null
  return date.toISOString().replace("Z", "+00:00")
}

function offsetMinutes(zone: string | undefined): number | null {
  if (!zone || zone.toUpperCase() === "Z") return 0
  const match = zone.match(/^([+-])(\d{2})(?::?(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? "0")
  if (hours > 14 || minutes > 59) return null
  const total = hours * 60 + minutes
  return match[1] === "-" ? -total : total
}

/** Returns the canonical string, or `null` when the value is not an unambiguous date. */
export function normalizeTradeDate(value: unknown): string | null {
  if (value instanceof Date) return canonicalFromMs(value.getTime())
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null
  if (CANONICAL_TRADE_DATE_RE.test(trimmed)) {
    return canonicalFromMs(Date.parse(trimmed))
  }

  const match = trimmed.match(ISO_LIKE_RE)
  if (!match) return null

  const [, y, mo, d, h, mi, s, frac, zone] = match
  const year = Number(y)
  const month = Number(mo)
  const day = Number(d)
  const hour = Number(h ?? "0")
  const minute = Number(mi ?? "0")
  const second = Number(s ?? "0")
  const millis = Number((frac ?? "").slice(0, 3).padEnd(3, "0"))

  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (hour > 23 || minute > 59 || second > 59) return null

  const offset = offsetMinutes(zone)
  if (offset === null) return null

  const wallMs = Date.UTC(year, month - 1, day, hour, minute, second, millis)
  const wall = new Date(wallMs)
  // Reject rollovers such as 2025-02-30.
  if (wall.getUTCMonth() !== month - 1 || wall.getUTCDate() !== day) return null

  return canonicalFromMs(wallMs - offset * 60_000)
}

export type TradeDateIssue = {
  index: number
  field: "entryDate" | "closeDate"
  value: unknown
}

/**
 * Normalizes `entryDate` and `closeDate` on each trade. Returns the rewritten
 * trades, or the list of values that could not be read unambiguously.
 */
export function normalizeTradeDates<
  T extends { entryDate?: unknown; closeDate?: unknown },
>(
  trades: T[],
): { ok: true; trades: T[] } | { ok: false; issues: TradeDateIssue[] } {
  const issues: TradeDateIssue[] = []
  const normalized = trades.map((trade, index) => {
    const entryDate = normalizeTradeDate(trade.entryDate)
    const closeDate = normalizeTradeDate(trade.closeDate)
    if (entryDate === null) {
      issues.push({ index, field: "entryDate", value: trade.entryDate })
    }
    if (closeDate === null) {
      issues.push({ index, field: "closeDate", value: trade.closeDate })
    }
    return { ...trade, entryDate, closeDate } as T
  })
  return issues.length > 0 ? { ok: false, issues } : { ok: true, trades: normalized }
}
