import React from "react"
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import {
  JOURNAL_EMOTION_MAX,
  type ExportJournalPdfPayload,
  type JournalDayEntry,
} from "./journal"

const COLORS = {
  headerBg: "#141826",
  text: "#181c25",
  mutedText: "#596073",
  cardBorder: "#dfe3ec",
  tableHeaderBg: "#f1f5f9",
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
  table: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    alignItems: "flex-start",
  },
  tableHeaderRow: {
    backgroundColor: COLORS.tableHeaderBg,
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 10,
    lineHeight: 1.4,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLORS.text,
  },
  colDate: { width: "18%" },
  colEmotion: { width: "14%" },
  colNews: { width: "12%" },
  colNotes: { width: "56%" },
  notesText: { color: COLORS.text },
  mutedText: { color: COLORS.mutedText },
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

export interface JournalStrings {
  title: string
  entriesCount: string
  tableDate: string
  tableEmotion: string
  tableNews: string
  tableNotes: string
  noNotes: string
  footerTitle: string
  page: string
}

function formatNotes(entry: JournalDayEntry, noNotes: string): string {
  const text = entry.journalText.trim()
  return text || noNotes
}

function TableHeader({ strings }: { strings: JournalStrings }) {
  return (
    <View style={[styles.tableRow, styles.tableHeaderRow]}>
      <Text style={[styles.tableCell, styles.tableHeaderCell, styles.colDate]}>
        {strings.tableDate}
      </Text>
      <Text style={[styles.tableCell, styles.tableHeaderCell, styles.colEmotion]}>
        {strings.tableEmotion}
      </Text>
      <Text style={[styles.tableCell, styles.tableHeaderCell, styles.colNews]}>
        {strings.tableNews}
      </Text>
      <Text style={[styles.tableCell, styles.tableHeaderCell, styles.colNotes]}>
        {strings.tableNotes}
      </Text>
    </View>
  )
}

function TableRow({
  entry,
  strings,
}: {
  entry: JournalDayEntry
  strings: JournalStrings
}) {
  const notes = formatNotes(entry, strings.noNotes)

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.colDate]}>{entry.date}</Text>
      <Text style={[styles.tableCell, styles.colEmotion]}>
        {`${entry.emotionValue}/${JOURNAL_EMOTION_MAX}`}
      </Text>
      <Text style={[styles.tableCell, styles.colNews]}>{String(entry.selectedNewsCount)}</Text>
      <Text style={[styles.tableCell, styles.colNotes, styles.notesText]}>{notes}</Text>
    </View>
  )
}

export function JournalDocument({
  payload,
  strings,
  generatedAt,
}: {
  payload: ExportJournalPdfPayload
  strings: JournalStrings
  generatedAt: string
}) {
  const entriesCountLabel = strings.entriesCount.replace(
    "{count}",
    String(payload.entries.length),
  )

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>{strings.title}</Text>
          <Text style={styles.headerMeta}>{entriesCountLabel}</Text>
          <Text style={styles.headerMeta}>{generatedAt}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.table}>
            <TableHeader strings={strings} />
            {payload.entries.map((entry) => (
              <TableRow key={entry.date} entry={entry} strings={strings} />
            ))}
          </View>
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
