"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Share, Check, ChevronsUpDown, Copy, Layout } from "lucide-react"
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
import { useTrades } from "@/components/context/trades-data"
import { useUser } from "@/components/context/user-data"
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

interface ShareButtonProps {
  variant?: "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  currentLayout?: {
    desktop: any[]
    mobile: any[]
  }
}

export function ShareButton({ variant = "ghost", size = "icon", currentLayout }: ShareButtonProps) {
  const t = useI18n()
  const { toast } = useToast()
  const { user } = useUser()
  const { trades } = useTrades()
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
        title: t('share.success'),
      })
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Share className="h-4 w-4" />
          <span className="sr-only">{t("share.button")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl sm:max-h-[95vh] max-h-[100dvh] w-full h-full sm:h-auto sm:w-[95vw] p-0">
        <div className="h-full flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle>{t("share.title")}</DialogTitle>
            <DialogDescription>
              {t("share.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid gap-4 p-6">
              {showManager ? (
                <SharedLayoutsManager onBack={() => setShowManager(false)} />
              ) : shareUrl ? (
                <div className="grid gap-2">
                  <Label>{t("share.shareUrl")}</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyUrl}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">{t("share.copyUrl")}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
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
                </>
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