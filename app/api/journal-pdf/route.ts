import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React from "react"
import enMessages from "@/locales/en"
import frMessages from "@/locales/fr"
import { JournalDocument, type JournalStrings } from "@/lib/pdf/journal-document"
import {
  sanitizeJournalTrades,
  type ExportJournalPdfPayload,
} from "@/lib/pdf/journal"

export const maxDuration = 60

const MESSAGES = { en: enMessages, fr: frMessages } as const

function makeTranslator(locale: "en" | "fr") {
  const catalog = MESSAGES[locale] ?? MESSAGES.en
  return (key: string): string => {
    const flat = (catalog as Record<string, unknown>)[key]
    if (typeof flat === "string") {
      return flat
    }
    let node: unknown = catalog
    for (const part of key.split(".")) {
      if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part]
      } else {
        return key
      }
    }
    return typeof node === "string" ? node : key
  }
}

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
    const date = typeof body.date === "string" ? body.date : ""
    const journalText = typeof body.journalText === "string" ? body.journalText : ""

    if (!date) {
      return NextResponse.json({ error: "missing-date" }, { status: 400 })
    }

    const locale: "en" | "fr" = body.locale === "fr" ? "fr" : "en"
    const payload: ExportJournalPdfPayload = {
      locale,
      date,
      emotionValue: Number(body.emotionValue ?? 0),
      selectedNewsCount: Number(body.selectedNewsCount ?? 0),
      journalText,
      trades: sanitizeJournalTrades(body.trades),
    }

    const t = makeTranslator(locale)
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
