import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildJournalDocx } from "./journal-document"
import {
  fetchJournalImages,
  fitJournalImageSize,
  normalizeJournalImageBytes,
} from "./journal-images"
import {
  MAX_IMAGES_PER_ENTRY,
  MAX_JOURNAL_DOCX_TEXT_LENGTH,
  allowlistJournalImageUrl,
  collectUniqueJournalImageUrls,
  sanitizeJournalDocxEntries,
  sanitizeJournalImageUrls,
} from "./journal"

const ORIGIN = "https://abc.supabase.co"
const ALLOWED = [ORIGIN]
const JOURNAL_PNG = `${ORIGIN}/storage/v1/object/public/trade-images/user-1/journal/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

function readDocxPart(buffer: Buffer, part: string): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "journal-docx-"))
  const file = join(dir, "export.docx")
  writeFileSync(file, buffer)
  return execFileSync("unzip", ["-p", file, part])
}

describe("journal image allowlisting", () => {
  it("accepts public trade-images journal objects on the configured origin", () => {
    expect(allowlistJournalImageUrl(JOURNAL_PNG, ALLOWED)).toBe(JOURNAL_PNG)
  })

  it("rejects arbitrary remote hosts and non-journal storage paths", () => {
    expect(
      allowlistJournalImageUrl(
        "https://evil.example/storage/v1/object/public/trade-images/user-1/journal/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
        ALLOWED,
      ),
    ).toBeNull()
    expect(
      allowlistJournalImageUrl(
        `${ORIGIN}/storage/v1/object/public/trade-images/user-1/trades/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`,
        ALLOWED,
      ),
    ).toBeNull()
    expect(allowlistJournalImageUrl("https://127.0.0.1/secret.png", ALLOWED)).toBeNull()
    expect(allowlistJournalImageUrl("file:///etc/passwd", ALLOWED)).toBeNull()
    expect(
      allowlistJournalImageUrl(
        `${JOURNAL_PNG}?token=abc`,
        ALLOWED,
      ),
    ).toBeNull()
    expect(
      allowlistJournalImageUrl(
        `${ORIGIN}/storage/v1/object/public/trade-images/user-1/journal/../trades/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`,
        ALLOWED,
      ),
    ).toBeNull()
  })

  it("drops disallowed URLs and caps images per entry", () => {
    const urls = [
      JOURNAL_PNG,
      "https://evil.example/chart.png",
      JOURNAL_PNG,
      ...Array.from({ length: 12 }, (_, index) =>
        `${ORIGIN}/storage/v1/object/public/trade-images/user-1/journal/${"b".repeat(64)}${index}.png`,
      ),
    ]
    const sanitized = sanitizeJournalImageUrls(urls, ALLOWED)
    expect(sanitized[0]).toBe(JOURNAL_PNG)
    expect(sanitized).not.toContain("https://evil.example/chart.png")
    expect(sanitized).toHaveLength(MAX_IMAGES_PER_ENTRY)
  })
})

describe("sanitizeJournalDocxEntries", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous
    }
  })

  it("keeps emoji text and allowlisted image URLs", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN
    const entries = sanitizeJournalDocxEntries([
      {
        date: "2026-11-03",
        emotionValue: 35,
        selectedNewsCount: 0,
        journalText: "⭐ 6. QUALITÉ DU TRADE\n🟠 B = valide",
        imageUrls: [JOURNAL_PNG, "https://evil.example/x.png"],
      },
      { date: "invalid", journalText: "skip" },
    ])

    expect(entries).toEqual([
      {
        date: "2026-11-03",
        emotionValue: 35,
        selectedNewsCount: 0,
        journalText: "⭐ 6. QUALITÉ DU TRADE\n🟠 B = valide",
        imageUrls: [JOURNAL_PNG],
      },
    ])
  })

  it("clamps text length without splitting emoji", () => {
    const entries = sanitizeJournalDocxEntries(
      [
        {
          date: "2026-11-03",
          journalText: `${"a".repeat(MAX_JOURNAL_DOCX_TEXT_LENGTH)}⭐`,
          imageUrls: [],
        },
      ],
      { allowedOrigins: ALLOWED },
    )
    expect(Array.from(entries[0]!.journalText)).toHaveLength(MAX_JOURNAL_DOCX_TEXT_LENGTH)
    expect(entries[0]!.journalText.endsWith("⭐")).toBe(false)
  })
})

describe("journal DOCX document", () => {
  it("embeds emoji in document text and a provided PNG in media", async () => {
    const normalized = await normalizeJournalImageBytes(new Uint8Array(ONE_PIXEL_PNG))
    expect(normalized).not.toBeNull()

    const image = {
      url: JOURNAL_PNG,
      data: normalized!.data,
      type: normalized!.type,
      width: normalized!.width,
      height: normalized!.height,
    }

    const buffer = await buildJournalDocx({
      locale: "fr",
      entries: [
        {
          date: "2026-11-03",
          emotionValue: 35,
          selectedNewsCount: 0,
          journalText: "⭐ 6. QUALITÉ DU TRADE\n🟠 B = valide mais imparfait",
          imageUrls: [JOURNAL_PNG],
        },
      ],
      images: new Map([[JOURNAL_PNG, image]]),
      strings: {
        title: "Journal de Trading",
        entriesCount: "{count} entrées",
        tableEmotion: "Humeur",
        tableNews: "News",
        noNotes: "Aucune note",
        footerTitle: "Relevé Deltalytix",
        page: "Page",
      },
      generatedAt: "Généré le: 2026-11-03 20:00 UTC",
    })

    expect(buffer.subarray(0, 2).toString("utf8")).toBe("PK")

    const xml = readDocxPart(buffer, "word/document.xml").toString("utf8")
    expect(xml).toContain("⭐ 6. QUALITÉ DU TRADE")
    expect(xml).toContain("🟠 B = valide mais imparfait")
    expect(xml).toContain("Journal de Trading")

    const media = readDocxPart(buffer, "word/media/image1.png")
    expect(media.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  })

  it("collects unique image URLs across days with a global cap", () => {
    const urls = collectUniqueJournalImageUrls([
      { date: "2026-11-01", emotionValue: 1, selectedNewsCount: 0, journalText: "", imageUrls: [JOURNAL_PNG] },
      { date: "2026-11-02", emotionValue: 1, selectedNewsCount: 0, journalText: "", imageUrls: [JOURNAL_PNG] },
    ])
    expect(urls).toEqual([JOURNAL_PNG])
  })

  it("fits oversized images into the page", () => {
    expect(fitJournalImageSize(1800, 900)).toEqual({ width: 600, height: 300 })
  })

  it("fetches allowlisted images through the provided fetch implementation", async () => {
    const fetchMock: typeof fetch = async (input) => {
      expect(String(input)).toBe(JOURNAL_PNG)
      return new Response(ONE_PIXEL_PNG, {
        status: 200,
        headers: { "content-type": "image/png" },
      })
    }

    const images = await fetchJournalImages(
      [
        {
          date: "2026-11-03",
          emotionValue: 35,
          selectedNewsCount: 0,
          journalText: "⭐",
          imageUrls: [JOURNAL_PNG],
        },
      ],
      { fetch: fetchMock },
    )

    expect(images.get(JOURNAL_PNG)?.type).toBe("png")
    expect(images.get(JOURNAL_PNG)?.data.byteLength).toBeGreaterThan(0)
  })
})
