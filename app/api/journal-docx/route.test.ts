import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it } from "vitest"
import { POST } from "./route"

const ORIGIN = "https://abc.supabase.co"

function readDocxPart(buffer: Buffer, part: string): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "journal-docx-route-"))
  const file = join(dir, "export.docx")
  writeFileSync(file, buffer)
  return execFileSync("unzip", ["-p", file, part])
}

describe("POST /api/journal-docx", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous
    }
  })

  it("returns a Word document that keeps emoji in the note body", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN

    const request = new NextRequest("http://localhost/api/journal-docx", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locale: "fr",
        entries: [
          {
            date: "2026-11-03",
            emotionValue: 35,
            selectedNewsCount: 0,
            journalText: "⭐ 6. QUALITÉ DU TRADE",
            imageUrls: ["https://evil.example/chart.png"],
          },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    const buffer = Buffer.from(await response.arrayBuffer())
    const xml = readDocxPart(buffer, "word/document.xml").toString("utf8")
    expect(xml).toContain("⭐ 6. QUALITÉ DU TRADE")
  })

  it("rejects an empty payload with the API error envelope", async () => {
    const request = new NextRequest("http://localhost/api/journal-docx", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: "en", entries: [] }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "bad_request" },
    })
  })
})
