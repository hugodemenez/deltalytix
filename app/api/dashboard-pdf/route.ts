import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React from "react"
import { formatInTimeZone } from "date-fns-tz"
import enMessages from "@/locales/en"
import frMessages from "@/locales/fr"
import { StatementDocument, type StatementStrings } from "@/lib/pdf/statement-document"
import type { ExportPdfPayload, PdfTrade } from "@/lib/pdf/statement"

// Generate the dashboard PDF on the server. Moving rendering off the client
// avoids the mobile tab-reload/out-of-memory failures that html2canvas caused:
// the browser only POSTs the (already filtered, already in-memory) trades it is
// displaying, and the server returns a finished PDF to download.
// (Node.js is the default runtime; an explicit `runtime` export is incompatible
// with this project's experimental.useCache config.)
export const maxDuration = 60

const MESSAGES = { en: enMessages, fr: frMessages } as const

// Resolve a translation key against a catalog that mixes flat dotted keys
// ("widgets.types.equityChart") with nested objects (tradeDistribution.title).
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

function buildStrings(t: (key: string) => string): StatementStrings {
  return {
    statementTitle: t("share.pdfStatementTitle"),
    statementSubtitle: t("share.pdfStatementSubtitle"),
    generatedOn: t("share.pdfGeneratedOn"),
    dateRange: t("share.pdfDateRange"),
    accounts: t("share.pdfAccounts"),
    allAccounts: t("share.pdfAllAccounts"),
    allTime: t("share.pdfAllTime"),
    summaryTitle: t("share.pdfSummaryTitle"),
    chartsSectionTitle: t("share.pdfChartsSectionTitle"),
    noChartsAvailable: t("share.pdfNoChartsAvailable"),
    footerTitle: t("share.pdfFooterTitle"),
    page: t("share.pdfPage"),
    totalTrades: t("share.pdfTotalTrades"),
    grossPnl: t("share.pdfGrossPnl"),
    netPnl: t("share.pdfNetPnl"),
    winRate: t("share.pdfWinRate"),
    equityChart: t("widgets.types.equityChart"),
    pnlChart: t("widgets.types.pnlChart"),
    weekdayPnl: t("widgets.types.weekdayPnl"),
    tradeDistribution: t("tradeDistribution.title"),
    win: t("tradeDistribution.win"),
    breakeven: t("tradeDistribution.breakeven"),
    loss: t("tradeDistribution.loss"),
  }
}

function sanitizeTrades(input: unknown): PdfTrade[] {
  if (!Array.isArray(input)) {
    return []
  }
  return input.map((raw) => {
    const t = raw as Record<string, unknown>
    return {
      entryDate: String(t.entryDate ?? ""),
      closeDate: t.closeDate != null ? String(t.closeDate) : null,
      pnl: Number(t.pnl ?? 0),
      commission: Number(t.commission ?? 0),
      accountNumber: String(t.accountNumber ?? ""),
      side: t.side != null ? String(t.side) : null,
      quantity: Number(t.quantity ?? 0),
      instrument: String(t.instrument ?? ""),
      timeInPosition: Number(t.timeInPosition ?? 0),
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ExportPdfPayload>
    const trades = sanitizeTrades(body.trades)

    if (trades.length === 0) {
      return NextResponse.json({ error: "no-trades" }, { status: 400 })
    }

    const locale: "en" | "fr" = body.locale === "fr" ? "fr" : "en"
    const timezone = typeof body.timezone === "string" && body.timezone ? body.timezone : "UTC"

    const payload: ExportPdfPayload = {
      locale,
      timezone,
      title: typeof body.title === "string" ? body.title : "",
      dateRange: body.dateRange ?? null,
      accountNumbers: Array.isArray(body.accountNumbers) ? body.accountNumbers.map(String) : [],
      trades,
    }

    const t = makeTranslator(locale)
    const strings = buildStrings(t)
    const generatedAt = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd HH:mm")

    // StatementDocument renders a @react-pdf <Document>; cast because
    // renderToBuffer's parameter is typed to ReactElement<DocumentProps>, which
    // createElement's inferred element type does not structurally match.
    const element = React.createElement(StatementDocument, {
      payload,
      strings,
      generatedAt,
    }) as React.ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)

    const filename = `dashboard-statement-${formatInTimeZone(new Date(), timezone, "yyyy-MM-dd")}.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[dashboard-pdf] generation failed:", error)
    return NextResponse.json({ error: "generation-failed" }, { status: 500 })
  }
}
