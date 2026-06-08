import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React from "react"
import { formatInTimeZone } from "date-fns-tz"
import { JournalDocument, type JournalStrings } from "@/lib/pdf/journal-document"
import {
  sanitizeJournalEntries,
  type ExportJournalPdfPayload,
} from "@/lib/pdf/journal"
import { makePdfTranslator } from "@/lib/pdf/locale"

export const maxDuration = 60

function buildStrings(t: (key: string) => string): JournalStrings {
  return {
    title: t("mindset.journaling.title"),
    entriesCount: t("mindset.exportAllPdfEntriesCount"),
    emotionTitle: t("mindset.emotion.title"),
    selectedNewsCount: t("mindset.editor.news.selectedCount"),
    entrySectionTitle: t("mindset.journaling.entrySectionTitle"),
    noNotes: t("mindset.exportAllPdfNoNotes"),
    footerTitle: t("share.pdfFooterTitle"),
    page: t("share.pdfPage"),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ExportJournalPdfPayload>
    const entries = sanitizeJournalEntries(body.entries)

    if (entries.length === 0) {
      return NextResponse.json({ error: "no-entries" }, { status: 400 })
    }

    const locale: "en" | "fr" = body.locale === "fr" ? "fr" : "en"
    const payload: ExportJournalPdfPayload = { locale, entries }

    const t = makePdfTranslator(locale)
    const strings = buildStrings(t)
    const generatedAt = `${t("share.pdfGeneratedOn")}: ${formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd HH:mm")} UTC`

    const element = React.createElement(JournalDocument, {
      payload,
      strings,
      generatedAt,
    }) as React.ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)
    const filename = `journal-export-${formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd")}.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[journal-pdf] generation failed:", error)
    return NextResponse.json({ error: "generation-failed" }, { status: 500 })
  }
}
