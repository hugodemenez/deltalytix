import { NextRequest, NextResponse } from "next/server"
import { formatInTimeZone } from "date-fns-tz"
import { jsonError } from "@/lib/api/json-error"
import { buildJournalDocx, type JournalDocxStrings } from "@/lib/docx/journal-document"
import { fetchJournalImages } from "@/lib/docx/journal-images"
import {
  getDefaultJournalImageOrigins,
  sanitizeJournalDocxEntries,
  type ExportJournalDocxPayload,
} from "@/lib/docx/journal"
import { makePdfTranslator } from "@/lib/pdf/locale"

export const maxDuration = 60

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

function buildStrings(t: (key: string) => string): JournalDocxStrings {
  return {
    title: t("mindset.journaling.title"),
    entriesCount: t("mindset.exportAllPdfEntriesCount"),
    tableEmotion: t("mindset.exportAllPdfTableEmotion"),
    tableNews: t("mindset.exportAllPdfTableNews"),
    noNotes: t("mindset.exportAllPdfNoNotes"),
    footerTitle: t("share.pdfFooterTitle"),
    page: t("share.pdfPage"),
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({
      code: "bad_request",
      message: "The journal export payload is not valid JSON.",
      hint: "Send a JSON object with locale and entries.",
      request,
    })
  }

  try {
    const payloadBody = (body ?? {}) as Partial<ExportJournalDocxPayload>
    const entries = sanitizeJournalDocxEntries(payloadBody.entries, {
      allowedOrigins: getDefaultJournalImageOrigins(),
    })

    if (entries.length === 0) {
      return jsonError({
        code: "bad_request",
        message: "No journal entries to export.",
        hint: "Save at least one mindset journal day, then retry the Word export.",
        request,
      })
    }

    const locale: "en" | "fr" = payloadBody.locale === "fr" ? "fr" : "en"
    const t = makePdfTranslator(locale)
    const strings = buildStrings(t)
    const generatedAt = `${t("share.pdfGeneratedOn")}: ${formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd HH:mm")} UTC`

    const images = await fetchJournalImages(entries)
    const buffer = await buildJournalDocx({
      locale,
      entries,
      images,
      strings,
      generatedAt,
    })
    const filename = `journal-export-${formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd")}.docx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": DOCX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[journal-docx] generation failed:", error)
    return jsonError({
      code: "internal_error",
      message: "Failed to generate the journal Word export.",
      hint: "Retry the export. If it keeps failing, export fewer days or remove oversized images.",
      request,
    })
  }
}
