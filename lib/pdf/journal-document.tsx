import React from "react"
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import { computeJournalSummary, type ExportJournalPdfPayload } from "./journal"

const COLORS = {
  headerBg: "#141826",
  text: "#181c25",
  mutedText: "#596073",
  cardBg: "#f8fafc",
  cardBorder: "#dfe3ec",
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: { paddingBottom: 48, fontFamily: "Helvetica", color: COLORS.text },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 18,
  },
  headerTitle: { color: COLORS.white, fontSize: 22, fontFamily: "Helvetica-Bold" },
  headerMeta: { color: "#aeb4c6", fontSize: 10, marginTop: 6 },
  body: { paddingHorizontal: 40, paddingTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 8 },
  bodyText: { fontSize: 11, lineHeight: 1.5, color: COLORS.text },
  summaryRow: { fontSize: 11, marginBottom: 4, color: COLORS.text },
  tradeLine: { fontSize: 10, marginBottom: 4, color: COLORS.mutedText },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 6,
    fontSize: 9,
    color: "#787e91",
  },
})

const fmtMoney = (value: number) => value.toFixed(2)

export interface JournalStrings {
  title: string
  selectDate: string
  emotionTitle: string
  selectedNewsCount: string
  entrySectionTitle: string
  tradeSummaryTitle: string
  tradeDetailsTitle: string
  tradesCount: string
  totalPnL: string
  commission: string
  netPnL: string
  footerTitle: string
  page: string
}

export function JournalDocument({
  payload,
  strings,
}: {
  payload: ExportJournalPdfPayload
  strings: JournalStrings
}) {
  const summary = computeJournalSummary(payload.trades)
  const selectedNewsLabel = strings.selectedNewsCount.replace(
    "{count}",
    String(payload.selectedNewsCount),
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>{strings.title}</Text>
          <Text style={styles.headerMeta}>{`${strings.selectDate}: ${payload.date}`}</Text>
          <Text style={styles.headerMeta}>
            {`${strings.emotionTitle}: ${payload.emotionValue}/100`}
          </Text>
          <Text style={styles.headerMeta}>{selectedNewsLabel}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>{strings.entrySectionTitle}</Text>
          <Text style={styles.bodyText}>{payload.journalText.trim() || "-"}</Text>

          <Text style={styles.sectionTitle}>{strings.tradeSummaryTitle}</Text>
          <Text style={styles.summaryRow}>
            {`${strings.tradesCount}: ${summary.tradesCount}`}
          </Text>
          <Text style={styles.summaryRow}>
            {`${strings.totalPnL}: ${fmtMoney(summary.totalGrossPnl)}`}
          </Text>
          <Text style={styles.summaryRow}>
            {`${strings.commission}: ${fmtMoney(summary.totalCommission)}`}
          </Text>
          <Text style={styles.summaryRow}>
            {`${strings.netPnL}: ${fmtMoney(summary.totalNetPnl)}`}
          </Text>

          {payload.trades.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>{strings.tradeDetailsTitle}</Text>
              {payload.trades.map((trade, index) => (
                <Text key={`${trade.instrument}-${index}`} style={styles.tradeLine}>
                  {`${index + 1}. ${trade.instrument} | ${trade.side ?? "-"} | Qty ${trade.quantity} | PnL ${fmtMoney(trade.pnl)} | Commission ${fmtMoney(trade.commission)}`}
                </Text>
              ))}
            </>
          ) : null}
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${strings.footerTitle} • ${strings.page} ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  )
}
