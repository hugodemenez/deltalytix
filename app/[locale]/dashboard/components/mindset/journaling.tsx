"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { EmotionSelector } from "./emotion-selector"
import { DayTagSelector } from "./day-tag-selector"
import { FinancialEvent, Trade } from "@/prisma/generated/prisma/browser"
import { TiptapEditor } from "@/components/tiptap-editor"
import { format } from "date-fns"
import { Download } from "lucide-react"
import { toast } from "sonner"

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
  const formattedDay = format(date, "yyyy-MM-dd")

  const getPlainTextFromHtml = (html: string) => {
    if (!html) return ""
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    return doc.body.textContent?.trim() ?? ""
  }

  const getTradesForSelectedDay = () => {
    return trades.filter((trade) => {
      const entryMatches = trade.entryDate?.startsWith(formattedDay)
      const closeMatches = trade.closeDate?.startsWith(formattedDay)
      return entryMatches || closeMatches
    })
  }

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf")

      const doc = new jsPDF({ unit: "pt", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 40
      const maxWidth = pageWidth - margin * 2
      const lineHeight = 16
      let y = margin

      const addWrappedText = (text: string, fontSize = 11) => {
        doc.setFontSize(fontSize)
        const lines = doc.splitTextToSize(text || "-", maxWidth)
        lines.forEach((line: string) => {
          if (y > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(line, margin, y)
          y += lineHeight
        })
      }

      const addSectionTitle = (title: string) => {
        if (y > pageHeight - margin * 2) {
          doc.addPage()
          y = margin
        }
        y += 8
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text(title, margin, y)
        y += lineHeight
        doc.setFont("helvetica", "normal")
      }

      const dayTrades = getTradesForSelectedDay()
      const totalGrossPnl = dayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
      const totalCommission = dayTrades.reduce(
        (sum, trade) => sum + (trade.commission || 0),
        0,
      )
      const totalNetPnl = totalGrossPnl - totalCommission

      const journalText = getPlainTextFromHtml(content)
      const selectedNewsCount = selectedNews.length

      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text(t("mindset.journaling.title"), margin, y)
      y += 26
      doc.setFont("helvetica", "normal")

      addWrappedText(`${t("mindset.selectDate")}: ${formattedDay}`)
      addWrappedText(`${t("mindset.emotion.title")}: ${emotionValue}/100`)
      addWrappedText(`${t("mindset.editor.news.selectedCount", { count: selectedNewsCount })}`)

      addSectionTitle(t("mindset.journaling.entrySectionTitle"))
      addWrappedText(journalText)

      addSectionTitle(t("mindset.journaling.tradeSummaryTitle"))
      addWrappedText(`${t("mindset.tradingStats.tradesCount")}: ${dayTrades.length}`)
      addWrappedText(`${t("mindset.tradingStats.totalPnL")}: ${totalGrossPnl.toFixed(2)}`)
      addWrappedText(`${t("mindset.tradingStats.commission")}: ${totalCommission.toFixed(2)}`)
      addWrappedText(`${t("mindset.tradingStats.netPnL")}: ${totalNetPnl.toFixed(2)}`)

      if (dayTrades.length > 0) {
        addSectionTitle(t("mindset.journaling.tradeDetailsTitle"))
        dayTrades.forEach((trade, index) => {
          const line =
            `${index + 1}. ${trade.instrument} | ${trade.side ?? "-"} | ` +
            `Qty ${trade.quantity} | PnL ${trade.pnl.toFixed(2)} | ` +
            `Commission ${trade.commission.toFixed(2)}`
          addWrappedText(line)
        })
      }

      doc.save(`journal-entry-${formattedDay}.pdf`)
      toast.success(t("mindset.journaling.exportPdfSuccess"))
    } catch (error) {
      console.error("Failed to export journal PDF:", error)
      toast.error(t("mindset.journaling.exportPdfError"))
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <h3 className="text-sm font-medium mb-2">{t('mindset.emotion.title')}</h3>
        <EmotionSelector
          value={emotionValue}
          onChange={onEmotionChange}
        />
      </div>

      <div className="flex-none mt-6">
        <DayTagSelector
          trades={trades}
          date={date}
          onApplyTagToAll={onApplyTagToAll}
        />
      </div>

      <div className="flex-1 min-h-0 mt-6 flex flex-col">
          <TiptapEditor
            content={content}
            onChange={onChange}
            placeholder={t('mindset.journaling.placeholder')}
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
        >
          <Download className="mr-2 h-4 w-4" />
          {t('mindset.journaling.exportPdf')}
        </Button>
        <Button
          onClick={onSave}
          className="w-full"
        >
          {t('mindset.journaling.save')}
        </Button>
      </div>
    </div>
  )
} 