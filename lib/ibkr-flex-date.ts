/**
 * Date/time parsing for IBKR Flex statements.
 *
 * Flex lets the user choose the date and time format when they build the query,
 * so the same field can arrive as `20250115;093000`, `2025-01-15 09:30:00`, or
 * `15/01/2025`. We accept every unambiguous form and explicitly refuse the
 * ambiguous ones rather than guessing — a silently mis-parsed `03/04/2025` puts
 * a trade on the wrong day and quietly corrupts the journal.
 *
 * When the statement carries no timezone the instant is read as UTC. That is
 * what IBKR's own default (no "Display Time Zone" column) implies, and it keeps
 * a trade's calendar day stable regardless of where the sync runs.
 */

/** Timezone abbreviations Flex emits when "Display Time Zone" is enabled. */
const TIMEZONE_OFFSETS_MINUTES: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  MST: -420,
  MDT: -360,
  PST: -480,
  PDT: -420,
  CET: 60,
  CEST: 120,
  BST: 60,
  JST: 540,
  HKT: 480,
  SGT: 480,
  AEST: 600,
  AEDT: 660,
}

interface DateParts {
  year: number
  month: number
  day: number
}

interface TimeParts {
  hour: number
  minute: number
  second: number
}

function parseDatePart(value: string): DateParts | null {
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) {
    return {
      year: Number(compact[1]),
      month: Number(compact[2]),
      day: Number(compact[3]),
    }
  }

  // yyyy-MM-dd / yyyy/MM/dd — unambiguous because the year leads.
  const dashed = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (dashed) {
    return {
      year: Number(dashed[1]),
      month: Number(dashed[2]),
      day: Number(dashed[3]),
    }
  }

  // dd/MM/yyyy and MM/dd/yyyy are indistinguishable for days <= 12, so we
  // refuse the whole shape instead of coin-flipping on which one it is.
  return null
}

function parseTimePart(value: string): TimeParts | null {
  const compact = value.match(/^(\d{2})(\d{2})(\d{2})$/)
  if (compact) {
    return {
      hour: Number(compact[1]),
      minute: Number(compact[2]),
      second: Number(compact[3]),
    }
  }

  const colonned = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonned) {
    return {
      hour: Number(colonned[1]),
      minute: Number(colonned[2]),
      second: colonned[3] ? Number(colonned[3]) : 0,
    }
  }

  return null
}

function isValidDate(date: DateParts): boolean {
  if (date.month < 1 || date.month > 12) return false
  if (date.day < 1 || date.day > 31) return false
  if (date.year < 1970 || date.year > 2200) return false
  // Reject e.g. 31 February, which Date.UTC would silently roll over.
  const probe = new Date(Date.UTC(date.year, date.month - 1, date.day))
  return probe.getUTCMonth() === date.month - 1 && probe.getUTCDate() === date.day
}

function isValidTime(time: TimeParts): boolean {
  return (
    time.hour >= 0 &&
    time.hour <= 23 &&
    time.minute >= 0 &&
    time.minute <= 59 &&
    time.second >= 0 &&
    time.second <= 59
  )
}

/**
 * Splits a trailing timezone off the value, returning its offset in minutes.
 * Recognises `+01:00`, `-0500`, `Z`, and the abbreviations above.
 */
function extractTimezone(value: string): { rest: string; offsetMinutes: number } {
  const trimmed = value.trim()

  const numeric = trimmed.match(/^(.*?)\s*([+-])(\d{2}):?(\d{2})$/)
  if (numeric) {
    const sign = numeric[2] === '-' ? -1 : 1
    const offset = sign * (Number(numeric[3]) * 60 + Number(numeric[4]))
    return { rest: numeric[1].trim(), offsetMinutes: offset }
  }

  const named = trimmed.match(/^(.*?)\s+([A-Z]{1,4})$/)
  if (named && named[2] in TIMEZONE_OFFSETS_MINUTES) {
    return { rest: named[1].trim(), offsetMinutes: TIMEZONE_OFFSETS_MINUTES[named[2]] }
  }

  if (/Z$/.test(trimmed) && /\d/.test(trimmed.slice(0, -1))) {
    return { rest: trimmed.slice(0, -1).trim(), offsetMinutes: 0 }
  }

  return { rest: trimmed, offsetMinutes: 0 }
}

/**
 * Parses a Flex date/time into an ISO-8601 instant in `+00:00` form, matching
 * the timestamp convention the rest of the app stores.
 *
 * Accepts a combined value (`20250115;093000`) or a separate date and time
 * (`tradeDate` + `tradeTime`). Returns null when the input is absent, malformed,
 * or ambiguous.
 */
export function parseFlexDateTime(
  dateTimeValue: string | null | undefined,
  timeValue?: string | null,
): string | null {
  if (!dateTimeValue) return null

  const { rest, offsetMinutes } = extractTimezone(dateTimeValue)
  if (!rest) return null

  // The date and time may be joined by ';', 'T', or whitespace, or supplied
  // as two separate attributes.
  let datePortion = rest
  let timePortion = timeValue?.trim() ?? ''

  const separatorMatch = rest.match(/^(.*?)[;T\s]+(.*)$/)
  if (separatorMatch) {
    datePortion = separatorMatch[1]
    // An explicit time argument wins over one embedded in the same string.
    if (!timePortion) timePortion = separatorMatch[2]
  }

  const date = parseDatePart(datePortion.trim())
  if (!date || !isValidDate(date)) return null

  let time: TimeParts = { hour: 0, minute: 0, second: 0 }
  if (timePortion) {
    const parsed = parseTimePart(timePortion.trim())
    // A present-but-unreadable time is a malformed row, not a midnight row.
    if (!parsed || !isValidTime(parsed)) return null
    time = parsed
  }

  const epochMs =
    Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, time.second) -
    offsetMinutes * 60_000

  return new Date(epochMs).toISOString().replace('Z', '+00:00')
}
