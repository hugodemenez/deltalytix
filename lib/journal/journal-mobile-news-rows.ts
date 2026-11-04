export type JournalMobileNewsEvent = {
  id: string
  time: string
  title: string
  importance: string
}

export type JournalMobileNewsRow = {
  key: string
  time: string
  event?: JournalMobileNewsEvent
}

export const JOURNAL_MOBILE_NEWS_LAST_HOUR = 18

export function journalMobileHourTicks(
  lastHour: number = JOURNAL_MOBILE_NEWS_LAST_HOUR,
): string[] {
  return Array.from({ length: lastHour + 1 }, (_, hour) => {
    return `${String(hour).padStart(2, "0")}:00`
  })
}

export function journalMobileNewsRows(
  events: JournalMobileNewsEvent[],
): JournalMobileNewsRow[] {
  const eventRows: JournalMobileNewsRow[] = events
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
    .map((event) => ({
      key: event.id,
      time: event.time,
      event,
    }))

  const occupiedTimes = new Set(eventRows.map((row) => row.time))
  const ticks: JournalMobileNewsRow[] = journalMobileHourTicks()
    .filter((time) => !occupiedTimes.has(time))
    .map((time) => ({
      key: `tick-${time}`,
      time,
    }))

  return [...ticks, ...eventRows].sort((a, b) => {
    const byTime = a.time.localeCompare(b.time)
    if (byTime !== 0) {
      return byTime
    }
    if (!a.event && b.event) {
      return -1
    }
    if (a.event && !b.event) {
      return 1
    }
    return 0
  })
}

export function newsImportanceDotClass(importance: string): string {
  switch (importance.toUpperCase()) {
    case "HIGH":
      return "bg-red-500"
    case "MEDIUM":
      return "bg-orange-400"
    case "LOW":
      return "bg-blue-400"
    default:
      return "bg-muted-foreground"
  }
}
