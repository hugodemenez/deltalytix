"use client"

import { useState, useMemo, useEffect, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Share, Check, ChevronsUpDown, Copy, Layout, ExternalLink } from "lucide-react"
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
import { useUserData } from "@/components/context/user-data"
import { useI18n } from "@/locales/client"
import { addDays, startOfDay, endOfDay, format } from "date-fns"
import { createShared } from "@/server/shared"
import { useToast } from "@/hooks/use-toast"
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

interface ShareButtonProps {
  variant?: "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  currentLayout?: {
    desktop: any[]
    mobile: any[]
  }
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
    const isMobile = useIsMobile()
    const { toast } = useToast()
    const { user, trades } = useUserData()
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const [comboboxOpen, setComboboxOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [shareUrl, setShareUrl] = useState<string>("")
    const [showManager, setShowManager] = useState(false)
    const [shareTitle, setShareTitle] = useState("")

    // Get the earliest and latest trade dates
    const defaultDateRange = useMemo(() => {
      if (!trades || trades.length === 0) {
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
      if (!trades) return []
      return Array.from(new Set(trades.map(trade => trade.accountNumber)))
    }, [trades])

    // Set all accounts as selected by default
    useEffect(() => {
      if (accountNumbers.length > 0 && selectedAccounts.length === 0) {
        setSelectedAccounts(accountNumbers)
      }
    }, [accountNumbers])

    const filteredAccounts = useMemo(() => {
      if (!searchQuery) return accountNumbers
      return accountNumbers.filter(account => 
        account.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }, [accountNumbers, searchQuery])

    const handleShare = async () => {
      try {
        if (!user) {
          toast({
            title: t('share.error'),
            description: t('share.error.auth'),
            variant: "destructive",
          })
          return
        }

        if (selectedAccounts.length === 0) {
          toast({
            title: t('share.error'),
            description: t('share.error.noAccount'),
            variant: "destructive",
          })
          return
        }

        if (!selectedDateRange.from) {
          toast({
            title: t('share.error'),
            description: t('share.error.noStartDate'),
            variant: "destructive",
          })
          return
        }

        const fromDate = startOfDay(selectedDateRange.from)
        const toDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : undefined

        const filteredTrades = trades.filter(trade => {
          const tradeDate = new Date(trade.entryDate)
          return selectedAccounts.includes(trade.accountNumber) &&
            tradeDate >= fromDate &&
            (!toDate || tradeDate <= toDate)
        })

        if (filteredTrades.length === 0) {
          toast({
            title: t('share.error'),
            description: t('share.error.noTrades'),
            variant: "destructive",
          })
          return
        }

        const slug = await createShared({
          userId: user.id,
          title: shareTitle || `Shared trades for ${selectedAccounts.length} accounts`,
          description: `Trades from ${selectedDateRange.from.toLocaleDateString()}${selectedDateRange.to ? ` to ${selectedDateRange.to.toLocaleDateString()}` : ''}`,
          isPublic: true,
          accountNumbers: selectedAccounts,
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

        toast({
          title: t('share.shareSuccess'),
          description: t('share.shareSuccessDescription'),
        })

        // Trigger confetti animation
        setTimeout(() => {
          triggerConfetti()
        }, 1000)
      } catch (error) {
        console.error('Error sharing trades:', error)
        toast({
          title: t('share.error'),
          description: error instanceof Error ? error.message : t('share.error.description'),
          variant: "destructive",
        })
      }
    }

    const handleCopyUrl = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: t('share.urlCopied'),
        })
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
        }
      }}>
        <DialogTrigger asChild>
          <Button 
            ref={ref}
            variant={variant}
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
        <DialogContent className="sm:max-w-4xl h-[90vh] sm:h-[85vh] w-[95vw] ">
          <div className="h-full flex flex-col overflow-y-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>{t("share.title")}</DialogTitle>
              <DialogDescription>
                {t("share.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="h-full overflow-y-hidden">
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
                  <div className="grid gap-4 h-full overflow-y-auto py-2">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowManager(true)}
                        className="mb-4"
                      >
                        <Layout className="h-4 w-4 mr-2" />
                        {t("share.manageLayouts")}
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("share.titleLabel")}</Label>
                      <Input
                        placeholder={t("share.titlePlaceholder")}
                        value={shareTitle}
                        onChange={(e) => setShareTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("share.accountsLabel")}</Label>
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
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
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" sideOffset={4}>
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
                    <div className="grid gap-4">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                          <Label className="mb-3 block">{t("share.startDateLabel")}</Label>
                          <div className="border rounded-lg p-3 bg-card">
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
                              className="w-full"
                              showOutsideDays
                              fixedWeeks
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <Label className="mb-3 block">{t("share.endDateLabel")}</Label>
                          <div className="border rounded-lg p-3 bg-card">
                            <Calendar
                              mode="single"
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
                              className="w-full"
                              showOutsideDays
                              fixedWeeks
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 mt-auto shrink-0">
              {showManager ? null : !shareUrl ? (
                <Button onClick={handleShare} className="w-full sm:w-auto">{t("share.shareButton")}</Button>
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
        </DialogContent>
      </Dialog>
    )
  }
)

ShareButton.displayName = "ShareButton" 