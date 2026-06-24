import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React from "react"
import { formatInTimeZone } from "date-fns-tz"
import { StatementDocument, type StatementStrings } from "@/lib/pdf/statement-document"
import { makePdfTranslator } from "@/lib/pdf/locale"
import { sanitizeTrades, type ExportPdfPayload } from "@/lib/pdf/statement"
import { DEFAULT_BREAKEVEN_RANGE, type BreakevenRange } from "@/types/breakeven"

// Generate the dashboard PDF on the server. Moving rendering off the client
// avoids the mobile tab-reload/out-of-memory failures that html2canvas caused:
// the browser only POSTs the (already filtered, already in-memory) trades it is
// displaying, and the server returns a finished PDF to download.
// (Node.js is the default runtime; an explicit `runtime` export is incompatible
// with this project's experimental.useCache config.)
export const maxDuration = 60

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
    tradesLabel: t("weekdayPnl.tooltip.trades"),
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

function sanitizeBreakevenRange(input: unknown): BreakevenRange {
  if (!input || typeof input !== "object") {
    return DEFAULT_BREAKEVEN_RANGE
  }
  const range = input as Record<string, unknown>
  const min = Number(range.min)
  const max = Number(range.max)
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return DEFAULT_BREAKEVEN_RANGE
  }
  return { min, max }
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
      breakevenRange: sanitizeBreakevenRange(body.breakevenRange),
      trades,
    }

    const t = makePdfTranslator(locale)
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
