import sharp from "sharp"
import {
  JOURNAL_IMAGE_FETCH_BUDGET_MS,
  JOURNAL_IMAGE_FETCH_CONCURRENCY,
  JOURNAL_IMAGE_FETCH_TIMEOUT_MS,
  MAX_IMAGE_BYTES,
  MAX_JOURNAL_IMAGES,
  MAX_TOTAL_IMAGE_BYTES,
  collectUniqueJournalImageUrls,
  type JournalDocxEntry,
} from "./journal"

export type EmbeddedJournalImage = {
  url: string
  data: Uint8Array
  type: "png" | "jpg"
  width: number
  height: number
}

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/x-png",
])

type FetchLike = typeof fetch

function isAllowedContentType(value: string | null): boolean {
  if (!value) {
    return true
  }
  const mime = value.split(";")[0]?.trim().toLowerCase() ?? ""
  return mime === "" || ALLOWED_CONTENT_TYPES.has(mime)
}

export function fitJournalImageSize(
  width: number,
  height: number,
  maxWidth = 600,
  maxHeight = 420,
): { width: number; height: number } {
  const safeWidth = width > 0 ? width : maxWidth
  const safeHeight = height > 0 ? height : Math.round((maxWidth * 2) / 3)
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1)
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  }
}

export async function normalizeJournalImageBytes(
  input: Uint8Array,
): Promise<Omit<EmbeddedJournalImage, "url"> | null> {
  if (input.byteLength === 0 || input.byteLength > MAX_IMAGE_BYTES) {
    return null
  }

  try {
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
    const metadata = await image.metadata()
    const format = metadata.format
    if (format !== "jpeg" && format !== "png" && format !== "webp") {
      return null
    }

    const type: "png" | "jpg" = format === "jpeg" ? "jpg" : "png"
    const data = format === "jpeg"
      ? await image.clone().jpeg({ quality: 85 }).toBuffer()
      : await image.clone().png().toBuffer()

    if (data.byteLength > MAX_IMAGE_BYTES) {
      return null
    }

    const fitted = fitJournalImageSize(metadata.width ?? 0, metadata.height ?? 0)
    return {
      data: new Uint8Array(data),
      type,
      width: fitted.width,
      height: fitted.height,
    }
  } catch {
    return null
  }
}

async function fetchOneJournalImage(
  url: string,
  fetchImpl: FetchLike,
): Promise<EmbeddedJournalImage | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), JOURNAL_IMAGE_FETCH_TIMEOUT_MS)

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: { Accept: "image/png,image/jpeg,image/webp,image/*;q=0.8" },
    })
    if (!response.ok) {
      return null
    }
    if (!isAllowedContentType(response.headers.get("content-type"))) {
      return null
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return null
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    const normalized = await normalizeJournalImageBytes(bytes)
    if (!normalized) {
      return null
    }
    return { url, ...normalized }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJournalImages(
  entries: readonly JournalDocxEntry[],
  options?: { fetch?: FetchLike; now?: () => number },
): Promise<Map<string, EmbeddedJournalImage>> {
  const urls = collectUniqueJournalImageUrls(entries).slice(0, MAX_JOURNAL_IMAGES)
  const results = new Map<string, EmbeddedJournalImage>()
  if (urls.length === 0) {
    return results
  }

  const fetchImpl = options?.fetch ?? fetch
  const now = options?.now ?? Date.now
  const startedAt = now()
  const pending = [...urls]
  let totalBytes = 0

  const worker = async () => {
    while (pending.length > 0) {
      if (now() - startedAt > JOURNAL_IMAGE_FETCH_BUDGET_MS) {
        return
      }
      if (totalBytes >= MAX_TOTAL_IMAGE_BYTES) {
        return
      }
      const url = pending.shift()
      if (!url) {
        return
      }
      const image = await fetchOneJournalImage(url, fetchImpl)
      if (!image) {
        continue
      }
      if (totalBytes + image.data.byteLength > MAX_TOTAL_IMAGE_BYTES) {
        continue
      }
      totalBytes += image.data.byteLength
      results.set(url, image)
    }
  }

  const workers = Array.from(
    { length: Math.min(JOURNAL_IMAGE_FETCH_CONCURRENCY, urls.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return results
}
