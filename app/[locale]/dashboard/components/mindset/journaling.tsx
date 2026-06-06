"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { EmotionSelector } from "./emotion-selector"
import { DayTagSelector } from "./day-tag-selector"
import { FinancialEvent, Trade } from "@/prisma/generated/prisma/browser"
import { TiptapEditor } from "@/components/tiptap-editor"
import { format } from "date-fns"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { tradeMatchesDateKey } from "@/lib/trades/trade-matches-date"

interface JournalingProps {
  content: string
  onChange: (content: string) => void
  onSave: () => void
  emotionValue: number
  onEmotionChange: (value: number) => void
  date: Date
  events: FinancialEvent[]
  selectedNews: string[]
  onNewsSelection: (newsIds: string[]) => void
  trades: Trade[]
  onApplyTagToAll: (tag: string) => Promise<void>
}

function getPlainTextFromHtml(html: string) {
  if (!html) return ""
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  return doc.body.textContent?.trim() ?? ""
}

export function Journaling({
  content,
  onChange,
  onSave,
  emotionValue,
  onEmotionChange,
  date,
  events,
  selectedNews,
  onNewsSelection,
  trades,
  onApplyTagToAll,
}: JournalingProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const [isExporting, setIsExporting] = useState(false)
  const formattedDay = format(date, "yyyy-MM-dd")

  const tradesForDay = useMemo(
    () => trades.filter((trade) => tradeMatchesDateKey(trade, formattedDay)),
    [trades, formattedDay],
  )

  const handleExportPdf = async () => {
    if (isExporting) {
      return
    }

    try {
      setIsExporting(true)

      const response = await fetch("/api/journal-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          date: formattedDay,
          emotionValue,
          selectedNewsCount: selectedNews.length,
          journalText: getPlainTextFromHtml(content),
          trades: tradesForDay.map((trade) => ({
            entryDate: trade.entryDate,
            closeDate: trade.closeDate ?? null,
            pnl: Number(trade.pnl || 0),
            commission: Number(trade.commission || 0),
            accountNumber: trade.accountNumber,
            side: trade.side ?? null,
            quantity: Number(trade.quantity || 0),
            instrument: trade.instrument,
            timeInPosition: Number(trade.timeInPosition || 0),
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`PDF request failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `journal-entry-${formattedDay}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success(t("mindset.journaling.exportPdfSuccess"))
    } catch (error) {
      console.error("Failed to export journal PDF:", error)
      toast.error(t("mindset.journaling.exportPdfError"))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <h3 className="text-sm font-medium mb-2">{t("mindset.emotion.title")}</h3>
        <EmotionSelector value={emotionValue} onChange={onEmotionChange} />
      </div>

      <div className="flex-none mt-6">
        <DayTagSelector trades={trades} date={date} onApplyTagToAll={onApplyTagToAll} />
      </div>

      <div className="flex-1 min-h-0 mt-6 flex flex-col">
        <TiptapEditor
          content={content}
          onChange={onChange}
          placeholder={t("mindset.journaling.placeholder")}
          width="100%"
          height="100%"
          events={events}
          selectedNews={selectedNews}
          onNewsSelection={onNewsSelection}
          date={date}
        />
      </div>

      <div className="flex-none flex gap-4 mt-6">
        <Button
          variant="outline"
          onClick={handleExportPdf}
          className="w-full"
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? t("share.exportPdfInProgress") : t("mindset.journaling.exportPdf")}
        </Button>
        <Button onClick={onSave} className="w-full">
          {t("mindset.journaling.save")}
        </Button>
      </div>
    </div>
  )
}
