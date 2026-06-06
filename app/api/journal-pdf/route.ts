import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React from "react"
import { JournalDocument, type JournalStrings } from "@/lib/pdf/journal-document"
import {
  clampJournalText,
  MAX_JOURNAL_TRADES,
  parseDateKey,
  type ExportJournalPdfPayload,
} from "@/lib/pdf/journal"
import { makePdfTranslator } from "@/lib/pdf/locale"
import { sanitizeTrades } from "@/lib/pdf/statement"

export const maxDuration = 60

function buildStrings(t: (key: string) => string): JournalStrings {
  return {
    title: t("mindset.journaling.title"),
    selectDate: t("mindset.selectDate"),
    emotionTitle: t("mindset.emotion.title"),
    selectedNewsCount: t("mindset.editor.news.selectedCount"),
    entrySectionTitle: t("mindset.journaling.entrySectionTitle"),
    tradeSummaryTitle: t("mindset.journaling.tradeSummaryTitle"),
    tradeDetailsTitle: t("mindset.journaling.tradeDetailsTitle"),
    tradesCount: t("mindset.tradingStats.tradesCount"),
    totalPnL: t("mindset.tradingStats.totalPnL"),
    commission: t("mindset.tradingStats.commission"),
    netPnL: t("mindset.tradingStats.netPnL"),
    footerTitle: t("share.pdfFooterTitle"),
    page: t("share.pdfPage"),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ExportJournalPdfPayload>
    const date = parseDateKey(body.date)

    if (!date) {
      return NextResponse.json({ error: "invalid-date" }, { status: 400 })
    }

    const locale: "en" | "fr" = body.locale === "fr" ? "fr" : "en"
    const trades = sanitizeTrades(body.trades).slice(0, MAX_JOURNAL_TRADES)
    const payload: ExportJournalPdfPayload = {
      locale,
      date,
      emotionValue: Number(body.emotionValue ?? 0),
      selectedNewsCount: Number(body.selectedNewsCount ?? 0),
      journalText: clampJournalText(body.journalText),
      trades,
    }

    const t = makePdfTranslator(locale)
    const strings = buildStrings(t)

    const element = React.createElement(JournalDocument, {
      payload,
      strings,
    }) as React.ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="journal-entry-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[journal-pdf] generation failed:", error)
    return NextResponse.json({ error: "generation-failed" }, { status: 500 })
  }
}
