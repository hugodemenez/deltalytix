import { format, parseISO } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx"
import { JOURNAL_EMOTION_MAX } from "@/lib/pdf/journal"
import type { EmbeddedJournalImage } from "./journal-images"
import type { JournalDocxEntry, JournalDocxLocale } from "./journal"

const COLORS = {
  title: "141826",
  text: "181C25",
  muted: "596073",
  rule: "DFE3EC",
  footer: "787E91",
}

export interface JournalDocxStrings {
  title: string
  entriesCount: string
  tableEmotion: string
  tableNews: string
  noNotes: string
  footerTitle: string
  page: string
}

function localeForDates(locale: JournalDocxLocale) {
  return locale === "fr" ? fr : enUS
}

function formatEntryDate(date: string, locale: JournalDocxLocale): string {
  try {
    return format(
      parseISO(date),
      locale === "fr" ? "EEEE d MMMM yyyy" : "EEEE, MMMM d, yyyy",
      { locale: localeForDates(locale) },
    )
  } catch {
    return date
  }
}

function bodyParagraphs(text: string, noNotes: string): Paragraph[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return [
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: noNotes,
            italics: true,
            color: COLORS.muted,
            size: 21,
          }),
        ],
      }),
    ]
  }

  return trimmed.split(/\n/).map(
    (line, index, lines) =>
      new Paragraph({
        spacing: { after: index === lines.length - 1 ? 160 : 80 },
        children: [
          new TextRun({
            text: line.length > 0 ? line : " ",
            color: COLORS.text,
            size: 22,
          }),
        ],
      }),
  )
}

function imageParagraphs(images: EmbeddedJournalImage[]): Paragraph[] {
  return images.map(
    (image) =>
      new Paragraph({
        spacing: { before: 80, after: 160 },
        children: [
          new ImageRun({
            type: image.type,
            data: image.data,
            transformation: {
              width: image.width,
              height: image.height,
            },
            altText: {
              name: "Journal image",
              description: "Chart or photo from the journal entry",
              title: "Journal image",
            },
          }),
        ],
      }),
  )
}

export async function buildJournalDocx({
  locale,
  entries,
  images,
  strings,
  generatedAt,
}: {
  locale: JournalDocxLocale
  entries: JournalDocxEntry[]
  images: Map<string, EmbeddedJournalImage>
  strings: JournalDocxStrings
  generatedAt: string
}): Promise<Buffer> {
  const entriesCountLabel = strings.entriesCount.replace(
    "{count}",
    String(entries.length),
  )

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: strings.title,
          bold: true,
          color: COLORS.title,
          size: 40,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: entriesCountLabel,
          color: COLORS.muted,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 360 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.rule, space: 8 },
      },
      children: [
        new TextRun({
          text: generatedAt,
          color: COLORS.muted,
          size: 20,
        }),
      ],
    }),
  ]

  entries.forEach((entry, index) => {
    const embedded = entry.imageUrls
      .map((url) => images.get(url))
      .filter((image): image is EmbeddedJournalImage => Boolean(image))

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: index === 0 ? 80 : 320, after: 80 },
        children: [
          new TextRun({
            text: formatEntryDate(entry.date, locale),
            bold: true,
            color: COLORS.title,
            size: 28,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: `${strings.tableEmotion}: ${entry.emotionValue}/${JOURNAL_EMOTION_MAX}  ·  ${strings.tableNews}: ${entry.selectedNewsCount}`,
            color: COLORS.muted,
            size: 20,
          }),
        ],
      }),
      ...bodyParagraphs(entry.journalText, strings.noNotes),
      ...imageParagraphs(embedded),
    )
  })

  const document = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            color: COLORS.text,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.27),
              height: convertInchesToTwip(11.69),
            },
            margin: {
              top: convertInchesToTwip(0.9),
              bottom: convertInchesToTwip(0.9),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                border: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: COLORS.rule,
                    space: 8,
                  },
                },
                children: [
                  new TextRun({
                    text: `${strings.footerTitle}  ·  ${strings.page} `,
                    color: COLORS.footer,
                    size: 16,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: COLORS.footer,
                    size: 16,
                  }),
                  new TextRun({
                    text: "/",
                    color: COLORS.footer,
                    size: 16,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    color: COLORS.footer,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(document)
}
