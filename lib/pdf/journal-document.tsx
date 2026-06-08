import React from "react"
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import {
  JOURNAL_EMOTION_MAX,
  type ExportJournalPdfPayload,
} from "./journal"

const COLORS = {
  headerBg: "#141826",
  text: "#181c25",
  mutedText: "#596073",
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
  dayTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 6,
    color: COLORS.text,
  },
  dayMeta: { fontSize: 10, marginBottom: 4, color: COLORS.mutedText },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 6 },
  bodyText: { fontSize: 11, lineHeight: 1.5, color: COLORS.text, marginBottom: 4 },
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
  emotionTitle: string
  selectedNewsCount: string
  entrySectionTitle: string
  noNotes: string
  footerTitle: string
  page: string
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
          {payload.entries.map((entry, index) => {
            const selectedNewsLabel = strings.selectedNewsCount.replace(
              "{count}",
              String(entry.selectedNewsCount),
            )
            const journalParagraphs = (entry.journalText.trim() || strings.noNotes).split(/\n/)

            return (
              <View key={entry.date} wrap={false}>
                <Text style={styles.dayTitle} break={index > 0}>
                  {entry.date}
                </Text>
                <Text style={styles.dayMeta}>
                  {`${strings.emotionTitle}: ${entry.emotionValue}/${JOURNAL_EMOTION_MAX}`}
                </Text>
                <Text style={styles.dayMeta}>{selectedNewsLabel}</Text>
                <Text style={styles.sectionTitle}>{strings.entrySectionTitle}</Text>
                {journalParagraphs.map((paragraph, paragraphIndex) => (
                  <Text key={`${entry.date}-${paragraphIndex}`} style={styles.bodyText}>
                    {paragraph || " "}
                  </Text>
                ))}
              </View>
            )
          })}
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
