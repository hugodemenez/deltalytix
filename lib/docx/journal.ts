import {
  JOURNAL_EMOTION_MAX,
  MAX_JOURNAL_ENTRIES,
  parseDateKey,
} from "@/lib/pdf/journal"

export type JournalDocxLocale = "en" | "fr"

export const MAX_JOURNAL_DOCX_TEXT_LENGTH = 20_000
export const MAX_IMAGES_PER_ENTRY = 8
export const MAX_JOURNAL_IMAGES = 50
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const MAX_TOTAL_IMAGE_BYTES = 24 * 1024 * 1024
export const JOURNAL_IMAGE_FETCH_TIMEOUT_MS = 8_000
export const JOURNAL_IMAGE_FETCH_BUDGET_MS = 20_000
export const JOURNAL_IMAGE_FETCH_CONCURRENCY = 4
export const MAX_JOURNAL_IMAGE_URL_LENGTH = 2_048

const JOURNAL_IMAGE_PATH =
  /^\/storage\/v1\/object\/public\/trade-images\/[A-Za-z0-9._-]+\/journal\/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i

export interface JournalDocxEntry {
  date: string
  emotionValue: number
  selectedNewsCount: number
  journalText: string
  imageUrls: string[]
}

export interface ExportJournalDocxPayload {
  locale: JournalDocxLocale
  entries: JournalDocxEntry[]
}

export function getDefaultJournalImageOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) {
    return []
  }
  try {
    return [new URL(raw).origin]
  } catch {
    return []
  }
}

function clampUnicode(input: string, maxChars: number): string {
  const chars = Array.from(input)
  if (chars.length <= maxChars) {
    return input
  }
  return chars.slice(0, maxChars).join("")
}

function toNonNegativeInt(input: unknown, max: number): number {
  const value = Number(input)
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.min(max, Math.round(value))
}

/**
 * Accept only public Supabase `trade-images` objects stored under
 * `{userId}/journal/…` on the configured project origin.
 */
export function allowlistJournalImageUrl(
  raw: unknown,
  allowedOrigins: readonly string[] = getDefaultJournalImageOrigins(),
): string | null {
  if (typeof raw !== "string") {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_JOURNAL_IMAGE_URL_LENGTH) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null
  }
  if (parsed.username || parsed.password) {
    return null
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    return null
  }

  const origin = parsed.origin.toLowerCase()
  const originAllowed = allowedOrigins.some(
    (candidate) => candidate.toLowerCase() === origin,
  )
  if (!originAllowed) {
    return null
  }

  let pathname: string
  try {
    pathname = decodeURIComponent(parsed.pathname)
  } catch {
    return null
  }
  if (pathname.includes("..") || pathname.includes("//")) {
    return null
  }
  if (!JOURNAL_IMAGE_PATH.test(pathname)) {
    return null
  }

  return `${parsed.origin}${pathname}`
}

export function sanitizeJournalImageUrls(
  input: unknown,
  allowedOrigins: readonly string[] = getDefaultJournalImageOrigins(),
): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  const urls: string[] = []
  const seen = new Set<string>()
  for (const raw of input) {
    if (urls.length >= MAX_IMAGES_PER_ENTRY) {
      break
    }
    const allowed = allowlistJournalImageUrl(raw, allowedOrigins)
    if (!allowed || seen.has(allowed)) {
      continue
    }
    seen.add(allowed)
    urls.push(allowed)
  }
  return urls
}

export function sanitizeJournalDocxEntries(
  input: unknown,
  options?: { allowedOrigins?: readonly string[] },
): JournalDocxEntry[] {
  if (!Array.isArray(input)) {
    return []
  }

  const allowedOrigins = options?.allowedOrigins ?? getDefaultJournalImageOrigins()
  const entries: JournalDocxEntry[] = []

  for (const raw of input) {
    if (entries.length >= MAX_JOURNAL_ENTRIES) {
      break
    }
    if (!raw || typeof raw !== "object") {
      continue
    }
    const item = raw as Record<string, unknown>
    const date = parseDateKey(item.date)
    if (!date) {
      continue
    }
    const journalText =
      typeof item.journalText === "string"
        ? clampUnicode(item.journalText, MAX_JOURNAL_DOCX_TEXT_LENGTH)
        : ""

    entries.push({
      date,
      emotionValue: toNonNegativeInt(item.emotionValue, JOURNAL_EMOTION_MAX),
      selectedNewsCount: toNonNegativeInt(item.selectedNewsCount, 10_000),
      journalText,
      imageUrls: sanitizeJournalImageUrls(item.imageUrls, allowedOrigins),
    })
  }

  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

export function collectUniqueJournalImageUrls(
  entries: readonly JournalDocxEntry[],
): string[] {
  const urls: string[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    for (const url of entry.imageUrls) {
      if (seen.has(url) || urls.length >= MAX_JOURNAL_IMAGES) {
        continue
      }
      seen.add(url)
      urls.push(url)
    }
  }
  return urls
}
