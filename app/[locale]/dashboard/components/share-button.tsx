"use client"

import { useState, useMemo, useEffect, useCallback, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Share, Check, ChevronsUpDown, Copy, Layout, ExternalLink, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { addDays, startOfDay, endOfDay, format } from "date-fns"
import { createShared } from "@/server/shared"
import { toast } from "sonner"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { SharedLayoutsManager } from "./shared-layouts-manager"
import { cn } from "@/lib/utils"
import confetti from 'canvas-confetti'
import { fr } from 'date-fns/locale'
import { Switch } from "@/components/ui/switch"
import { useTradesStore } from "../../../../store/trades-store"
import { useUserStore } from "../../../../store/user-store"

interface ShareButtonProps {
  variant?: "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  currentLayout?: {
    desktop: Array<Record<string, unknown>>
    mobile: Array<Record<string, unknown>>
  }
}

const CHART_WIDGET_LABELS: Record<string, string> = {
  equityChart: "Equity Curve",
  pnlChart: "P&L",
  timeOfDay: "Time of Day Performance",
  timeInPosition: "Time in Position",
  timeRangePerformance: "Time Range Performance",
  weekdayPnl: "Weekday P&L",
  pnlBySide: "P&L by Side",
  pnlPerContract: "P&L per Contract",
  pnlPerContractDaily: "Daily P&L per Contract",
  commissionsPnl: "Commissions vs P&L",
  tradeDistribution: "Trade Distribution",
  dailyTickTarget: "Daily Tick Target",
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

function triggerConfetti() {
  const count = 200
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  })

  fire(0.2, {
    spread: 60,
  })

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  })
}

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(
  ({ variant = "ghost", size = "icon", currentLayout }, ref) => {
    const t = useI18n()
    const locale = useCurrentLocale()
    const dateLocale = locale === 'fr' ? fr : undefined
    const isMobile = useIsMobile()
    const user = useUserStore(state => state.user)
    const trades = useTradesStore(state => state.trades)
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const [comboboxOpen, setComboboxOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [shareUrl, setShareUrl] = useState<string>("")
    const [showManager, setShowManager] = useState(false)
    const [shareTitle, setShareTitle] = useState("")
    const [shareAllAccounts, setShareAllAccounts] = useState(true)

    // Get the earliest and latest trade dates
    const defaultDateRange = useMemo(() => {
      if (!trades || trades.length === 0 || !Array.isArray(trades)) {
        return {
          from: new Date(),
          to: undefined
        }
      }

      const timestamps = trades.map(trade => new Date(trade.entryDate).getTime())
      return {
        from: startOfDay(new Date(Math.min(...timestamps))),
        to: undefined
      }
    }, [trades])

    const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
      from: defaultDateRange.from,
      to: undefined
    } as DateRange)

    // Update date range when trades change
    useEffect(() => {
      setSelectedDateRange({
        from: defaultDateRange.from,
        to: undefined
      })
    }, [defaultDateRange])

    // Get unique account numbers from trades
    const accountNumbers = useMemo(() => {
      if (!trades || !Array.isArray(trades)) return []
      return Array.from(new Set(trades.map(trade => trade.accountNumber)))
    }, [trades])

    const filteredAccounts = useMemo(() => {
      if (!searchQuery) return accountNumbers
      return accountNumbers.filter(account => 
        account.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }, [accountNumbers, searchQuery])

    const getFilteredTrades = useCallback(() => {
      if (!selectedDateRange.from) {
        return []
      }

      const fromDate = startOfDay(selectedDateRange.from)
      const toDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : undefined

      return trades.filter((trade) => {
        const tradeDate = new Date(trade.entryDate)
        const hasValidDate = !Number.isNaN(tradeDate.getTime())
        if (!hasValidDate) {
          return false
        }

        return (shareAllAccounts || selectedAccounts.includes(trade.accountNumber)) &&
          tradeDate >= fromDate &&
          (!toDate || tradeDate <= toDate)
      })
    }, [selectedDateRange.from, selectedDateRange.to, shareAllAccounts, selectedAccounts, trades])

    const showExportError = useCallback((description: string) => {
      toast.error(t("share.exportPdfErrorTitle"), {
        description,
      })
    }, [t])

    const captureChartSnapshots = useCallback(async () => {
      const { default: html2canvas } = await import("html2canvas")
      const openFixedLayers = Array.from(
        document.querySelectorAll<HTMLElement>('[data-state="open"]'),
      ).filter((element) => {
        const style = window.getComputedStyle(element)
        if (style.position !== "fixed") {
          return false
        }

        return element.getAttribute("role") === "dialog" || Number(style.zIndex || 0) >= 50
      })

      const previousVisibility = openFixedLayers.map((element) => ({
        element,
        visibility: element.style.visibility,
      }))

      openFixedLayers.forEach((element) => {
        element.style.visibility = "hidden"
      })

      try {
      const chartNodes = Array.from(
        document.querySelectorAll<HTMLElement>('[data-widget-category="charts"]'),
      )
        .filter((node) => node.offsetWidth > 0 && node.offsetHeight > 0)
        .slice(0, 6)

      const snapshots: Array<{ title: string; imageDataUrl: string }> = []

      for (const node of chartNodes) {
        const widgetType = node.dataset.widgetType || ""
        const title = CHART_WIDGET_LABELS[widgetType] || t("share.pdfChartFallbackTitle")

        const canvas = await html2canvas(node, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        })

        snapshots.push({
          title,
          imageDataUrl: canvas.toDataURL("image/png"),
        })
      }

      if (snapshots.length === 0) {
        const dashboardGrid = document.querySelector<HTMLElement>(".react-grid-layout")
        if (dashboardGrid && dashboardGrid.offsetWidth > 0 && dashboardGrid.offsetHeight > 0) {
          const canvas = await html2canvas(dashboardGrid, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
          })

          snapshots.push({
            title: t("share.pdfDashboardSnapshotTitle"),
            imageDataUrl: canvas.toDataURL("image/png"),
          })
        }
      }

      return snapshots
      } finally {
        previousVisibility.forEach(({ element, visibility }) => {
          if (visibility) {
            element.style.visibility = visibility
            return
          }
          element.style.removeProperty("visibility")
        })
      }
    }, [t])

    const handleShare = async () => {
      try {
        if (!user) {
          toast.error(t('share.error'), {
            description: t('share.error.auth'),
          })
          return
        }

        if (!shareAllAccounts && selectedAccounts.length === 0) {
          toast.error(t('share.error'), {
            description: t('share.error.noAccount'),
          })
          return
        }

        if (!selectedDateRange.from) {
          toast.error(t('share.error'), {
            description: t('share.error.noStartDate'),
          })
          return
        }

        const filteredTrades = getFilteredTrades()

        const fromDate = startOfDay(selectedDateRange.from)
        const toDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : undefined

        if (filteredTrades.length === 0) {
          toast.error(t('share.error'), {
            description: t('share.error.noTrades'),
          })
          return
        }

        const slug = await createShared({
          userId: user.id,
          title: shareTitle || `Shared trades${shareAllAccounts ? ' for all accounts' : ` for ${selectedAccounts.length} accounts`}`,
          description: `Trades from ${selectedDateRange.from.toLocaleDateString()}${selectedDateRange.to ? ` to ${selectedDateRange.to.toLocaleDateString()}` : ''}`,
          isPublic: true,
          accountNumbers: shareAllAccounts ? [] : selectedAccounts,
          dateRange: {
            from: fromDate,
            ...(toDate && { to: toDate })
          },
          expiresAt: addDays(new Date(), 7),
          desktop: currentLayout?.desktop || [
            {
              i: "widget1732477563848",
              type: "calendarWidget",
              size: "large",
              x: 0,
              y: 1,
              w: 6,
              h: 8
            },
            {
              i: "widget1732477566865",
              type: "equityChart",
              size: "medium",
              x: 6,
              y: 1,
              w: 6,
              h: 4
            },
            {
              i: "widget1734881236127",
              type: "pnlChart",
              size: "medium",
              x: 6,
              y: 5,
              w: 6,
              h: 4
            },
            {
              i: "widget1734881247979",
              type: "cumulativePnl",
              size: "tiny",
              x: 0,
              y: 0,
              w: 3,
              h: 1
            },
            {
              i: "widget1734881251266",
              type: "longShortPerformance",
              size: "tiny",
              x: 3,
              y: 0,
              w: 3,
              h: 1
            },
            {
              i: "widget1734881254352",
              type: "tradePerformance",
              size: "tiny",
              x: 6,
              y: 0,
              w: 3,
              h: 1
            },
            {
              i: "widget1734881263452",
              type: "averagePositionTime",
              size: "tiny",
              x: 9,
              y: 0,
              w: 3,
              h: 1
            }
          ],
          mobile: currentLayout?.mobile || [
            {
              i: "widget1732477563848",
              type: "calendarWidget",
              size: "large",
              x: 0,
              y: 2,
              w: 12,
              h: 6
            },
            {
              i: "widget1732477566865",
              type: "equityChart",
              size: "medium",
              x: 0,
              y: 8,
              w: 12,
              h: 6
            },
            {
              i: "widget1734881247979",
              type: "cumulativePnl",
              size: "tiny",
              x: 0,
              y: 0,
              w: 12,
              h: 1
            },
            {
              i: "widget1734881254352",
              type: "tradePerformance",
              size: "tiny",
              x: 0,
              y: 1,
              w: 12,
              h: 1
            }
          ]
        })

        // Set the share URL
        const url = `${window.location.origin}/shared/${slug}`
        setShareUrl(url)

        toast.success(t('share.shareSuccess'), {
          description: t('share.shareSuccessDescription'),
        })

        // Trigger confetti animation
        setTimeout(() => {
          triggerConfetti()
        }, 1000)
      } catch (error) {
        console.error('Error sharing trades:', error)
        toast.error(t('share.error'), {
          description: error instanceof Error ? error.message : t('share.error.description'),
        })
      }
    }

    const handleExportPdf = async () => {
      try {
        if (!selectedDateRange.from) {
          showExportError(t('share.error.noStartDate'))
          return
        }

        const filteredTrades = getFilteredTrades()

        const chartSnapshots = await captureChartSnapshots()
        const { jsPDF } = await import("jspdf")
        const doc = new jsPDF({ unit: "pt", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 40
        const contentWidth = pageWidth - margin * 2
        const cardGap = 14
        let y = 180

        const formatMoney = (value: number) => value.toFixed(2)

        const totalGrossPnl = filteredTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0)
        const totalNetPnl = filteredTrades.reduce(
          (sum, trade) => sum + Number(trade.pnl || 0) - Number(trade.commission || 0),
          0,
        )
        const winningTrades = filteredTrades.filter((trade) => Number(trade.pnl || 0) > 0).length
        const winRate = filteredTrades.length > 0 ? (winningTrades / filteredTrades.length) * 100 : 0

        const formattedFromDate = format(selectedDateRange.from, "yyyy-MM-dd")
        const formattedToDate = selectedDateRange.to
          ? format(selectedDateRange.to, "yyyy-MM-dd")
          : null
        const dateRangeLabel = formattedToDate
          ? `${formattedFromDate} - ${formattedToDate}`
          : formattedFromDate

        const accountLabel = shareAllAccounts
          ? t("share.pdfAllAccounts")
          : selectedAccounts.length > 0
            ? selectedAccounts.join(", ")
            : t("share.pdfAllAccounts")

        const drawHeader = () => {
          doc.setFillColor(20, 24, 38)
          doc.rect(0, 0, pageWidth, 140, "F")
          doc.setDrawColor(67, 73, 96)
          doc.setLineWidth(1)
          doc.line(0, 140, pageWidth, 140)

          doc.setTextColor(255, 255, 255)
          doc.setFont("helvetica", "bold")
          doc.setFontSize(22)
          doc.text(shareTitle.trim() || t("share.pdfStatementTitle"), margin, 52)
          doc.setFont("helvetica", "normal")
          doc.setFontSize(11)
          doc.text(t("share.pdfStatementSubtitle"), margin, 72)

          doc.setFontSize(10)
          doc.text(`${t("share.pdfGeneratedOn")}: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, margin, 98)
          doc.text(`${t("share.pdfDateRange")}: ${dateRangeLabel}`, margin, 114)
          doc.text(`${t("share.pdfAccounts")}: ${accountLabel}`, margin, 130)

          doc.setTextColor(35, 39, 47)
        }

        const ensureSpace = (requiredHeight: number) => {
          if (y + requiredHeight <= pageHeight - margin) {
            return
          }
          doc.addPage()
          drawHeader()
          y = 170
        }

        const drawMetricCard = (x: number, cardY: number, label: string, value: string, valueColor?: [number, number, number]) => {
          const cardHeight = 68
          doc.setFillColor(248, 250, 252)
          doc.setDrawColor(223, 227, 236)
          doc.roundedRect(x, cardY, (contentWidth - cardGap) / 2, cardHeight, 8, 8, "FD")
          doc.setFont("helvetica", "normal")
          doc.setFontSize(10)
          doc.setTextColor(89, 96, 115)
          doc.text(label, x + 12, cardY + 22)
          doc.setFont("helvetica", "bold")
          doc.setFontSize(16)
          if (valueColor) {
            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2])
          } else {
            doc.setTextColor(24, 28, 37)
          }
          doc.text(value, x + 12, cardY + 48)
          doc.setTextColor(35, 39, 47)
        }

        const addSectionTitle = (title: string) => {
          ensureSpace(28)
          doc.setFont("helvetica", "bold")
          doc.setFontSize(14)
          doc.setTextColor(24, 28, 37)
          doc.text(title, margin, y)
          y += 16
        }

        const chartCardWidth = (contentWidth - cardGap) / 2
        const chartCardHeight = 200
        const getChartCardTop = (index: number) => y + Math.floor(index / 2) * (chartCardHeight + cardGap)

        const renderChartCards = () => {
          if (chartSnapshots.length === 0) {
            ensureSpace(60)
            doc.setFont("helvetica", "normal")
            doc.setFontSize(11)
            doc.setTextColor(89, 96, 115)
            doc.text(t("share.pdfNoChartsAvailable"), margin, y + 24)
            y += 44
            return
          }

          chartSnapshots.forEach((snapshot, index) => {
            const isRightColumn = index % 2 === 1
            const cardX = isRightColumn ? margin + chartCardWidth + cardGap : margin
            const cardY = getChartCardTop(index)

            ensureSpace(chartCardHeight + cardGap)

            doc.setFillColor(255, 255, 255)
            doc.setDrawColor(223, 227, 236)
            doc.roundedRect(cardX, cardY, chartCardWidth, chartCardHeight, 8, 8, "FD")

            doc.setFont("helvetica", "bold")
            doc.setFontSize(10)
            doc.setTextColor(38, 43, 56)
            doc.text(snapshot.title, cardX + 12, cardY + 18)

            const imageProps = doc.getImageProperties(snapshot.imageDataUrl)
            const availableWidth = chartCardWidth - 20
            const availableHeight = chartCardHeight - 36
            const widthRatio = availableWidth / imageProps.width
            const heightRatio = availableHeight / imageProps.height
            const ratio = Math.min(widthRatio, heightRatio)
            const imageWidth = imageProps.width * ratio
            const imageHeight = imageProps.height * ratio
            const imageX = cardX + (chartCardWidth - imageWidth) / 2
            const imageY = cardY + 26 + (availableHeight - imageHeight) / 2

            doc.addImage(snapshot.imageDataUrl, "PNG", imageX, imageY, imageWidth, imageHeight, undefined, "FAST")
          })

          const rows = Math.ceil(chartSnapshots.length / 2)
          y += rows * (chartCardHeight + cardGap)
        }

        drawHeader()

        addSectionTitle(t("share.pdfSummaryTitle"))
        ensureSpace(160)

        const leftX = margin
        const rightX = margin + (contentWidth - cardGap) / 2 + cardGap
        const rowOneY = y + 6
        const rowTwoY = rowOneY + 82
        const pnlColor: [number, number, number] = totalNetPnl >= 0 ? [24, 140, 92] : [199, 59, 68]

        drawMetricCard(leftX, rowOneY, t("share.pdfTotalTrades"), String(filteredTrades.length))
        drawMetricCard(rightX, rowOneY, t("share.pdfWinRate"), `${winRate.toFixed(2)}%`)
        drawMetricCard(leftX, rowTwoY, t("share.pdfGrossPnl"), formatMoney(totalGrossPnl))
        drawMetricCard(rightX, rowTwoY, t("share.pdfNetPnl"), formatMoney(totalNetPnl), pnlColor)

        y = rowTwoY + 86

        addSectionTitle(t("share.pdfChartsSectionTitle"))
        renderChartCards()

        const pageCount = doc.getNumberOfPages()
        for (let page = 1; page <= pageCount; page++) {
          doc.setPage(page)
          doc.setDrawColor(223, 227, 236)
          doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30)
          doc.setFont("helvetica", "normal")
          doc.setFontSize(9)
          doc.setTextColor(120, 126, 145)
          doc.text(
            `${t("share.pdfFooterTitle")} • ${t("share.pdfPage")} ${page}/${pageCount}`,
            margin,
            pageHeight - 16,
          )
        }

        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.save(`dashboard-statement-${format(new Date(), "yyyy-MM-dd")}.pdf`)
        toast.success(t("share.exportPdfSuccess"), {
          description: t("share.exportPdfSuccessDescription"),
        })
      } catch (error) {
        console.error("Error exporting dashboard PDF:", error)
        showExportError(t("share.exportPdfError"))
      }
    }

    const handleCopyUrl = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success(t('share.urlCopied'))
      } catch (error) {
        console.error('Error copying URL:', error)
      }
    }

    const toggleAccount = (account: string) => {
      setSelectedAccounts(prev => 
        prev.includes(account) 
          ? prev.filter(a => a !== account)
          : [...prev, account]
      )
    }

    const selectAll = () => {
      setSelectedAccounts(accountNumbers)
    }

    const deselectAll = () => {
      setSelectedAccounts([])
    }

    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          setShowManager(false)
          setShareUrl("")
          setShareTitle("")
          setShareAllAccounts(false)
        }
      }}>
        <DialogTrigger asChild>
          <Button 
            ref={ref}
            variant={variant}
            size={size}
            className={cn(
              "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
              isMobile ? "w-10 p-0" : "min-w-[120px] gap-3 px-4"
            )}
          >
            <Share className="h-4 w-4 shrink-0" />
            {!isMobile && (
              <span className="text-sm font-medium">
                {t("share.button")}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl h-[90vh] sm:h-[85vh] w-[95vw]">
          <div className="h-full flex flex-col overflow-y-hidden">
              <DialogHeader>
                <DialogTitle>{t("share.title")}</DialogTitle>
                <DialogDescription>
                  {t("share.description")}
                </DialogDescription>
              </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
              <div className="h-full">
                {showManager ? (
                  <SharedLayoutsManager onBack={() => setShowManager(false)} />
                ) : shareUrl ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-full max-w-xl space-y-6 -mt-20">
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold">{t("share.shareSuccess")}</h3>
                        <p className="text-muted-foreground">{t("share.shareSuccessDescription")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-center block">{t("share.shareUrl")}</Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={shareUrl}
                            className="pr-24 font-mono text-sm bg-muted text-center"
                          />
                          <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCopyUrl}
                              className="h-7 w-7"
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">{t("share.copyUrl")}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(shareUrl, '_blank')}
                              className="h-7 w-7"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">{t("share.openInNewTab")}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-7xl mx-auto space-y-4">
                    <div className="space-y-2">
                      <Label>{t("share.titleLabel")}</Label>
                      <Input
                        placeholder={t("share.titlePlaceholder")}
                        value={shareTitle}
                        onChange={(e) => setShareTitle(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="share-all-accounts"
                        checked={shareAllAccounts}
                        onCheckedChange={setShareAllAccounts}
                      />
                      <Label htmlFor="share-all-accounts">{t("share.shareAllAccounts")}</Label>
                    </div>
                    {!shareAllAccounts && (
                      <div className="space-y-2 relative">
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen} modal>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={comboboxOpen}
                              className="w-full justify-between"
                            >
                              <span className="flex items-center gap-2">
                                {selectedAccounts.length === 0 && t("share.accountsPlaceholder")}
                                {selectedAccounts.length > 0 && (
                                  <span>
                                    {selectedAccounts.length} / {accountNumbers.length} {t("share.accounts")}
                                  </span>
                                )}
                              </span>
                              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-(--radix-popover-trigger-width) p-0" 
                            align="start" 
                            side="bottom" 
                            sideOffset={4}
                            style={{ zIndex: 99999 }}
                          >
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder={t("share.searchAccounts")} 
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                              />
                              <CommandEmpty>{t("share.noAccountFound")}</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  <CommandItem
                                    value="select-all"
                                    onSelect={() => {
                                      if (selectedAccounts.length === accountNumbers.length) {
                                        deselectAll()
                                      } else {
                                        selectAll()
                                      }
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Check
                                      className="h-4 w-4 opacity-0 data-[selected=true]:opacity-100"
                                      data-selected={selectedAccounts.length === accountNumbers.length}
                                    />
                                    <span className="flex-1">{t("filters.selectAllAccounts")}</span>
                                  </CommandItem>
                                  <ScrollArea className="h-48">
                                    {filteredAccounts.map((account) => (
                                      <CommandItem
                                        key={account}
                                        value={account}
                                        onSelect={() => toggleAccount(account)}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <Check
                                          className="h-4 w-4 opacity-0 data-[selected=true]:opacity-100"
                                          data-selected={selectedAccounts.includes(account)}
                                        />
                                        <span className="flex-1">{account}</span>
                                      </CommandItem>
                                    ))}
                                  </ScrollArea>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    <div className="grid gap-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <div className="space-y-2">
                            <Label>{t("share.startDateLabel")}</Label>
                            <div className="border rounded-lg bg-card p-2">
                              <Calendar
                                mode="single"
                                selected={selectedDateRange.from}
                                onSelect={(date) =>
                                  setSelectedDateRange((prev) => ({
                                    ...prev,
                                    from: date || prev.from
                                  }))
                                }
                                defaultMonth={selectedDateRange.from}
                                className="w-full [&_.rdp-nav]:p-0 [&_.rdp-caption]:p-2 [&_.rdp-months]:p-2 pt-0"
                                showOutsideDays
                                fixedWeeks
                                locale={dateLocale}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="space-y-2">
                            <Label>{t("share.endDateLabel")}</Label>
                            <div className="border rounded-lg bg-card p-2">
                              <Calendar
                                mode="single"
                                selected={selectedDateRange.to}
                                onSelect={(date) =>
                                  setSelectedDateRange((prev) => ({
                                    ...prev,
                                    to: date
                                  }))
                                }
                                defaultMonth={selectedDateRange.to || selectedDateRange.from}
                                fromDate={selectedDateRange.from}
                                disabled={(date) =>
                                  selectedDateRange.from ? date < selectedDateRange.from : false
                                }
                                className="w-full [&_.rdp-nav]:p-0 [&_.rdp-caption]:p-2 [&_.rdp-months]:p-2 pt-0"
                                showOutsideDays
                                fixedWeeks
                                locale={dateLocale}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
              <DialogFooter>
                {showManager ? null : !shareUrl ? (
                  <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={handleExportPdf}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("share.exportPdfButton")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowManager(true)}
                    >
                      <Layout className="h-4 w-4 mr-2" />
                      {t("share.manageLayouts")}
                    </Button>
                    <Button onClick={handleShare}>{t("share.shareButton")}</Button>
                  </div>
                ) : (
                  <Button onClick={() => {
                    setShareUrl("")
                    setShareTitle("")
                    setOpen(false)
                  }} className="w-full sm:w-auto">
                    {t("share.quit")}
                  </Button>
                )}
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

ShareButton.displayName = "ShareButton" 