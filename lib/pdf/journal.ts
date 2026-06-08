export type JournalPdfLocale = "en" | "fr"

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
export const MAX_JOURNAL_ENTRIES = 500
export const MAX_JOURNAL_TEXT_LENGTH = 10_000
// Display scale for PDF export (selector stores 0–95 in steps of 5).
export const JOURNAL_EMOTION_MAX = 100

export interface JournalDayEntry {
  date: string
  emotionValue: number
  selectedNewsCount: number
  journalText: string
}

export interface ExportJournalPdfPayload {
  locale: JournalPdfLocale
  entries: JournalDayEntry[]
}

export function parseDateKey(input: unknown): string | null {
  if (typeof input !== "string" || !DATE_KEY_PATTERN.test(input)) {
    return null
  }
  return input
}

export function clampJournalText(input: unknown): string {
  if (typeof input !== "string") {
    return ""
  }
  return input.slice(0, MAX_JOURNAL_TEXT_LENGTH)
}

export function sanitizeJournalEntries(input: unknown): JournalDayEntry[] {
  if (!Array.isArray(input)) {
    return []
  }

  const entries: JournalDayEntry[] = []
  for (const raw of input) {
    if (entries.length >= MAX_JOURNAL_ENTRIES) {
      break
    }
    const item = raw as Record<string, unknown>
    const date = parseDateKey(item.date)
    if (!date) {
      continue
    }
    entries.push({
      date,
      emotionValue: Number(item.emotionValue ?? 0),
      selectedNewsCount: Number(item.selectedNewsCount ?? 0),
      journalText: clampJournalText(item.journalText),
    })
  }

  return sortJournalEntries(entries)
}

export function sortJournalEntries(entries: JournalDayEntry[]): JournalDayEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}
