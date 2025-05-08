'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Info, Plus, X, Clock, CheckCircle, XCircle, DollarSign, Trash2, Save } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, Locale } from "date-fns"
import { cn } from "@/lib/utils"
import { useUserData } from "@/components/context/user-data"
import { setupPropFirmAccount, getPropFirmAccounts, addPropFirmPayout, deletePayout, updatePayout, deletePropFirmAccount } from '@/app/[locale]/(dashboard)/dashboard/data/actions'
import { useI18n } from "@/locales/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AccountTable } from './account-table'
import { toast } from "@/hooks/use-toast"
import { WidgetSize } from '../../types/dashboard'
import { enUS, fr } from 'date-fns/locale'
import { useParams } from 'next/navigation'
import { PropFirmCard } from './prop-firm-card'
import { Switch } from "@/components/ui/switch"
import { PropFirmConfigurator } from './prop-firm-configurator'
import { AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogDescription, AlertDialogTitle, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface PropFirmAccount {
  id: string
  accountNumber: string
  balanceToDate: number
  profitTarget: number
  drawdownThreshold: number
  isPerformance: boolean
  startingBalance: number
  propfirm: string
  lastBalanceUpdate?: Date
  lastBalanceAmount?: number
  payouts: Array<{
    id: string
    amount: number
    date: Date
    status: string
  }>
  trailingDrawdown: boolean
  trailingStopProfit: number
  resetDate: Date | null | undefined
  consistencyPercentage: number
}

interface ConsistencyMetrics {
  accountNumber: string
  totalProfit: number
  maxAllowedDailyProfit: number | null
  highestProfitDay: number
  isConsistent: boolean
  hasProfitableData: boolean
  isConfigured: boolean
  dailyPnL: { [key: string]: number }
  totalProfitableDays: number
}

interface DailyMetric {
  date: Date
  pnl: number
  totalBalance: number
  percentageOfTarget: number
  isConsistent: boolean
  payout?: {
    id: string
    amount: number
    date: Date
    status: string
  }
}

interface Payout {
  date: Date
  amount: number
  status: string
}

interface PayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountNumber: string
  existingPayout?: {
    id: string
    date: Date
    amount: number
    status: string
  }
  onSubmit: (payout: Payout) => Promise<void>
  onDelete?: () => Promise<void>
}

const localeMap: { [key: string]: Locale } = {
  en: enUS,
  fr: fr
}

function PayoutDialog({
  open,
  onOpenChange,
  accountNumber,
  existingPayout,
  onSubmit,
  onDelete
}: PayoutDialogProps) {
  const params = useParams()
  const locale = params.locale as string
  const dateLocale = locale === 'fr' ? fr : undefined
  const [date, setDate] = useState<Date>(existingPayout?.date ?? new Date())
  const [amount, setAmount] = useState<number>(existingPayout?.amount ?? 0)
  const [inputValue, setInputValue] = useState<string>(existingPayout?.amount?.toString() ?? "")
  const [status, setStatus] = useState<string>(existingPayout?.status ?? 'PENDING')
  const t = useI18n()

  useEffect(() => {
    if (existingPayout) {
      setDate(existingPayout.date)
      setAmount(existingPayout.amount)
      setInputValue(existingPayout.amount.toString())
      setStatus(existingPayout.status)
    } else {
      setDate(new Date())
      setAmount(0)
      setInputValue("")
      setStatus('PENDING')
    }
  }, [existingPayout, open])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    const numericValue = value ? Number(value) : 0
    if (!isNaN(numericValue)) {
      setAmount(numericValue)
    }
  }

  const statusOptions = [
    { value: 'PENDING', label: t('propFirm.payout.statuses.pending'), icon: <Clock className="h-4 w-4" /> },
    { value: 'VALIDATED', label: t('propFirm.payout.statuses.validated'), icon: <CheckCircle className="h-4 w-4" /> },
    { value: 'REFUSED', label: t('propFirm.payout.statuses.refused'), icon: <XCircle className="h-4 w-4" /> },
    { value: 'PAID', label: t('propFirm.payout.statuses.paid'), icon: <DollarSign className="h-4 w-4" /> }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[75vh]">
        <DialogHeader>
          <DialogTitle>{existingPayout ? t('propFirm.payout.edit') : t('propFirm.payout.add')}</DialogTitle>
          <DialogDescription>
            {existingPayout ? t('propFirm.payout.editDescription') : t('propFirm.payout.addDescription')} {accountNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Amount Input with Currency Symbol */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('propFirm.payout.amount')}</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                className="pl-9"
                value={inputValue}
                onChange={handleAmountChange}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('propFirm.payout.date')}</Label>
              <p className="text-sm text-muted-foreground">
                {format(date, 'PPP', { locale: localeMap[params.locale as string] })}
              </p>
            </div>
            <div className="flex justify-center rounded-md border">
              <Calendar
                mode="single"
                numberOfMonths={2}
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) {
                    // Set the time to noon to prevent timezone issues
                    const adjustedDate = new Date(newDate);
                    adjustedDate.setHours(12, 0, 0, 0);
                    setDate(adjustedDate);
                  }
                }}
                initialFocus
                locale={localeMap[params.locale as string]}
                showOutsideDays
                fixedWeeks
                className="rounded-md"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('propFirm.payout.status')}</Label>
            <div className="grid grid-cols-4 gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={status === option.value ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setStatus(option.value)}
                >
                  {option.icon}
                  <span className="ml-2">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          {existingPayout && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('propFirm.payout.delete')}
            </Button>
          )}
          <Button
            onClick={() => onSubmit({ date, amount, status })}
            disabled={amount <= 0}
            className="w-full sm:w-auto"
          >
            {existingPayout ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('propFirm.payout.update')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('propFirm.payout.save')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PropFirmOverview({ size }: { size: WidgetSize }) {
  const { trades, user, accountNumbers, groups } = useUserData()
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const [dbAccounts, setDbAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<ConsistencyMetrics | null>(null)
  const [selectedAccountForTable, setSelectedAccountForTable] = useState<PropFirmAccount | null>(null)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<{
    id: string;
    date: Date;
    amount: number;
    status: string;
  } | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [canDeleteAccount, setCanDeleteAccount] = useState(false)

  useEffect(() => {
    async function fetchAccounts() {
      if (!user) return
      try {
        const accounts = await getPropFirmAccounts(user.id)
        setDbAccounts(accounts)
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
      }
    }
    fetchAccounts()
  }, [user])

  useEffect(() => {
    async function checkAccountExists() {
      if (!user || !selectedAccountForTable) {
        setCanDeleteAccount(false)
        return
      }

      const accounts = await getPropFirmAccounts(user.id)
      const accountExists = accounts.some(acc => acc.number === selectedAccountForTable.accountNumber)
      setCanDeleteAccount(accountExists)
    }

    checkAccountExists()
  }, [user, selectedAccountForTable])

  const propFirmAccounts = useMemo(() => {
    const uniqueAccounts = new Set(trades.map(trade => trade.accountNumber))
    // Find the hidden group
    const hiddenGroup = groups.find(g => g.name === "Hidden Accounts")
    const hiddenAccountNumbers = hiddenGroup ? new Set(hiddenGroup.accounts.map(a => a.number)) : new Set()

    return Array.from(uniqueAccounts)
      .filter(accountNumber =>
        (accountNumbers.length === 0 || accountNumbers.includes(accountNumber)) &&
        !hiddenAccountNumbers.has(accountNumber)
      )
      .map(accountNumber => {
        const accountTrades = trades.filter(t => t.accountNumber === accountNumber)
        const dbAccount = dbAccounts.find(acc => acc.number === accountNumber)

        // Filter trades based on reset date if it exists
        const relevantTrades = dbAccount?.resetDate
          ? accountTrades.filter(t => new Date(t.entryDate) >= new Date(dbAccount.resetDate!))
          : accountTrades

        const balance = relevantTrades.reduce((total, trade) => total + trade.pnl - (trade.commission || 0), 0)
        const totalPayouts = dbAccount?.payouts?.reduce((sum: number, payout: { status: string, amount: number }) =>
          sum + (payout.status === 'PAID' ? payout.amount : 0), 0) || 0

        return {
          id: accountNumber,
          accountNumber,
          balanceToDate: balance - totalPayouts,
          profitTarget: dbAccount?.profitTarget ?? 0,
          drawdownThreshold: dbAccount?.drawdownThreshold ?? 0,
          isPerformance: dbAccount?.isPerformance ?? false,
          startingBalance: dbAccount?.startingBalance ?? 0,
          propfirm: dbAccount?.propfirm ?? '',
          payouts: dbAccount?.payouts ?? [],
          trailingDrawdown: dbAccount?.trailingDrawdown ?? false,
          trailingStopProfit: dbAccount?.trailingStopProfit ?? 0,
          resetDate: dbAccount?.resetDate,
          consistencyPercentage: dbAccount?.consistencyPercentage ?? 30,
        }
      })
  }, [trades, dbAccounts, accountNumbers, groups])

  const consistencyMetrics = useMemo(() => {
    return propFirmAccounts.map(account => {
      const accountTrades = trades.filter(t => t.accountNumber === account.accountNumber)
      const dailyPnL: { [key: string]: number } = {}

      // First calculate total profit including commissions
      const totalProfit = accountTrades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)
      const hasProfitableData = totalProfit > 0

      // Check if account is properly configured
      const isConfigured = account.profitTarget > 0 && account.consistencyPercentage > 0

      // Then calculate daily PnLs
      accountTrades.forEach(trade => {
        const date = new Date(trade.entryDate).toISOString().split('T')[0]
        if (!dailyPnL[date]) dailyPnL[date] = 0
        dailyPnL[date] += trade.pnl - (trade.commission || 0)
      })

      const highestProfitDay = Math.max(...Object.values(dailyPnL))

      // Only calculate consistency metrics if we have profitable data and account is configured
      if (hasProfitableData && isConfigured) {
        // Use profit target as base until profits exceed it
        const baseAmount = totalProfit <= account.profitTarget
          ? account.profitTarget
          : totalProfit

        const maxAllowedDailyProfit = baseAmount * (account.consistencyPercentage / 100)
        const isConsistent = highestProfitDay <= maxAllowedDailyProfit

        return {
          accountNumber: account.accountNumber,
          totalProfit,
          maxAllowedDailyProfit,
          highestProfitDay,
          isConsistent,
          hasProfitableData,
          isConfigured,
          dailyPnL,
          totalProfitableDays: Object.values(dailyPnL).filter(pnl => pnl > 0).length
        }
      }

      // Return default values for unconfigured or unprofitable accounts
      return {
        accountNumber: account.accountNumber,
        totalProfit,
        maxAllowedDailyProfit: null,
        highestProfitDay,
        isConsistent: false,
        hasProfitableData,
        isConfigured,
        dailyPnL,
        totalProfitableDays: Object.values(dailyPnL).filter(pnl => pnl > 0).length
      }
    })
  }, [trades, propFirmAccounts])

  const dailyPnLPercentages = useMemo(() => {
    if (!selectedAccount || !selectedAccount.totalProfit) return []

    return Object.entries(selectedAccount.dailyPnL)
      .map(([date, pnl]) => ({
        date,
        pnl,
        percentageOfTotal: (pnl / selectedAccount.totalProfit) * 100,
        isConsistent: selectedAccount.maxAllowedDailyProfit
          ? pnl <= selectedAccount.maxAllowedDailyProfit
          : true
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedAccount])

  const dailyMetrics = useMemo(() => {
    if (!selectedAccountForTable) return []

    const accountTrades = trades.filter(t => t.accountNumber === selectedAccountForTable.accountNumber)
    const dailyPnL: { [key: string]: number[] } = {}

    // Calculate total profit first
    const totalProfit = accountTrades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)

    // First, get all unique dates from both trades and payouts
    const allDates = new Set<string>()

    // Add trade dates
    accountTrades.forEach(trade => {
      const date = new Date(trade.entryDate).toISOString().split('T')[0]
      allDates.add(date)
      if (!dailyPnL[date]) dailyPnL[date] = []
      dailyPnL[date].push(trade.pnl - (trade.commission || 0))
    })

    // Add payout dates
    selectedAccountForTable.payouts?.forEach(payout => {
      const date = new Date(payout.date).toISOString().split('T')[0]
      allDates.add(date)
      // Only initialize the array if it doesn't exist
      if (!dailyPnL[date]) dailyPnL[date] = []
    })

    let runningBalance = selectedAccountForTable.startingBalance || 0
    const metrics: DailyMetric[] = Array.from(allDates)
      .sort()
      .map(date => {
        // Calculate daily PnL from trades
        const dailyTradesPnL = dailyPnL[date]?.reduce((sum, pnl) => sum + pnl, 0) || 0
        runningBalance += dailyTradesPnL

        // Check consistency against total profit, not running balance
        const isConsistent = totalProfit <= 0 ? true : dailyTradesPnL <= (totalProfit * ((selectedAccountForTable.consistencyPercentage || 30) / 100))

        // Find payout for this date if it exists
        const payout = selectedAccountForTable.payouts?.find(p =>
          new Date(p.date).toISOString().split('T')[0] === date
        )

        // If there's a payout, deduct it from the running balance
        if (payout?.status === 'PAID') {
          runningBalance -= payout.amount
        }

        return {
          date: new Date(date),
          pnl: dailyTradesPnL,
          totalBalance: runningBalance,
          percentageOfTarget: selectedAccountForTable.profitTarget ? (totalProfit / selectedAccountForTable.profitTarget) * 100 : 0,
          isConsistent,
          payout: payout ? {
            id: payout.id,
            amount: payout.amount,
            date: payout.date,
            status: payout.status
          } : undefined
        }
      })

    return metrics
  }, [selectedAccountForTable, trades])

  // Add this function to handle both add and update
  const handleAddPayout = async (payout: Payout) => {
    if (!selectedAccountForTable || !user) return

    try {
      if (selectedPayout) {
        // Update existing payout
        await updatePayout({
          id: selectedPayout.id,
          ...payout
        })
      } else {
        // Add new payout
        await addPropFirmPayout({
          userId: user.id,
          accountNumber: selectedAccountForTable.accountNumber,
          ...payout
        })
      }

      // Reload the accounts data
      const accounts = await getPropFirmAccounts(user.id)
      setDbAccounts(accounts)

      // Update the selected account with new data
      const updatedDbAccount = accounts.find(acc => acc.number === selectedAccountForTable.accountNumber)
      if (updatedDbAccount) {
        setSelectedAccountForTable({
          ...selectedAccountForTable,
          payouts: updatedDbAccount.payouts || []
        })
      }

      setPayoutDialogOpen(false)
      setSelectedPayout(undefined)

      toast({
        title: selectedPayout ? t('propFirm.payout.updateSuccess') : t('propFirm.payout.success'),
        description: selectedPayout ? t('propFirm.payout.updateSuccessDescription') : t('propFirm.payout.successDescription'),
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to handle payout:', error)
      toast({
        title: t('propFirm.payout.error'),
        description: t('propFirm.payout.errorDescription'),
        variant: "destructive"
      })
    }
  }

  const handleDeletePayout = async () => {
    if (!selectedAccountForTable || !user || !selectedPayout) return

    try {
      await deletePayout(selectedPayout.id)

      // Reload the accounts data
      const accounts = await getPropFirmAccounts(user.id)
      setDbAccounts(accounts)

      // Update the selected account with new data
      const updatedDbAccount = accounts.find(acc => acc.number === selectedAccountForTable.accountNumber)
      if (updatedDbAccount) {
        setSelectedAccountForTable({
          ...selectedAccountForTable,
          payouts: updatedDbAccount.payouts || []
        })
      }

      setPayoutDialogOpen(false)
      setSelectedPayout(undefined)

      toast({
        title: t('propFirm.payout.deleteSuccess'),
        description: t('propFirm.payout.deleteSuccessDescription'),
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to delete payout:', error)
      toast({
        title: t('propFirm.payout.deleteError'),
        description: t('propFirm.payout.deleteErrorDescription'),
        variant: "destructive"
      })
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedAccountForTable || !canDeleteAccount) return

    try {
      setIsDeleting(true)
      await deletePropFirmAccount(selectedAccountForTable.accountNumber, user.id)

      // Update local storage
      const storedAccounts = localStorage.getItem('propFirmAccounts')
      if (storedAccounts) {
        const parsedAccounts = JSON.parse(storedAccounts)
        const updatedAccounts = parsedAccounts.filter((acc: PropFirmAccount) =>
          acc.accountNumber !== selectedAccountForTable.accountNumber
        )
        localStorage.setItem('propFirmAccounts', JSON.stringify(updatedAccounts))
      }

      // Update the accounts list
      const updatedAccounts = await getPropFirmAccounts(user.id)
      setDbAccounts(updatedAccounts)

      // Close the dialog
      setSelectedAccountForTable(null)

      toast({
        title: t('propFirm.toast.deleteSuccess'),
        description: t('propFirm.toast.deleteSuccessDescription'),
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to delete account:', error)
      toast({
        title: t('propFirm.toast.deleteError'),
        description: t('propFirm.toast.deleteErrorDescription'),
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              {t('propFirm.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('propFirm.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div
          className="flex-1 overflow-y-auto h-full"
          style={{ height: 'calc(100% - 1rem)' }}
        >
          {/* Group accounts by their groups */}
          <div className="mt-4">
            <div className="flex gap-4 flex-wrap">
              {groups.map(group => {
                // Filter accounts for this group
                const groupAccounts = propFirmAccounts.filter(account => {
                  // Find the account in the group's accounts
                  return group.accounts.some(a => a.number === account.accountNumber);
                });

                // Skip groups with no accounts
                if (groupAccounts.length === 0) return null;

                return (
                  <div 
                    key={group.id} 
                    className={cn(
                      "bg-muted/50 rounded-lg p-4 w-fit",
                    )}
                  >
                    <h3 className="text-base font-medium mb-3">{group.name}</h3>
                    <div className={cn(
                      "flex flex-1 gap-4", 
                    )}>
                      {groupAccounts.map(account => {
                        const metrics = consistencyMetrics.find(m => m.accountNumber === account.accountNumber)
                        const accountTrades = trades.filter(t => t.accountNumber === account.accountNumber)
                        return (
                          <PropFirmCard
                            key={account.accountNumber}
                            account={account}
                            trades={accountTrades}
                            metrics={metrics}
                            onClick={() => setSelectedAccountForTable(account)}
                          />
                        )
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Show ungrouped accounts */}
              {(() => {
                const groupedAccountNumbers = new Set(
                  groups.flatMap(group => group.accounts.map(a => a.number))
                );
                
                const ungroupedAccounts = propFirmAccounts.filter(
                  account => !groupedAccountNumbers.has(account.accountNumber)
                );

                if (ungroupedAccounts.length === 0) return null;

                return (
                  <div 
                    className={cn(
                      "bg-muted/50 rounded-lg p-4 w-fit",
                    )}
                  >
                    <h3 className="text-base font-medium mb-3">{t('propFirm.ungrouped')}</h3>
                    <div className={cn(
                      "flex flex-wrap gap-4", 
                    )}>
                      {ungroupedAccounts.map(account => {
                        const metrics = consistencyMetrics.find(m => m.accountNumber === account.accountNumber)
                        const accountTrades = trades.filter(t => t.accountNumber === account.accountNumber)
                        return (
                          <PropFirmCard
                            key={account.accountNumber}
                            account={account}
                            trades={accountTrades}
                            metrics={metrics}
                            onClick={() => setSelectedAccountForTable(account)}
                          />
                        )
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <Dialog
          open={!!selectedAccountForTable}
          onOpenChange={(open) => !open && setSelectedAccountForTable(null)}
        >
          <DialogContent className="max-w-7xl h-[80vh] flex flex-col overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{t('propFirm.configurator.title', { accountNumber: selectedAccountForTable?.accountNumber })}</DialogTitle>
                  <DialogDescription>{t('propFirm.configurator.description')}</DialogDescription>
                </div>
                <div className="flex items-center gap-2 pr-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPayout(undefined)
                      setPayoutDialogOpen(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('propFirm.payout.add')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting || !canDeleteAccount}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('common.delete')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('propFirm.delete.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('propFirm.delete.description', { account: selectedAccountForTable?.accountNumber })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? t('common.deleting') : t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-6 pt-4 flex-1 overflow-y-auto">
              {selectedAccountForTable && (
                <Tabs 
                  defaultValue={selectedAccountForTable.profitTarget === 0 ? "configurator" : "table"}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="table">Table</TabsTrigger>
                    <TabsTrigger value="configurator">Configurator</TabsTrigger>
                  </TabsList>
                  <TabsContent value="table" className="mt-4">
                    <AccountTable
                      accountNumber={selectedAccountForTable.accountNumber}
                      startingBalance={selectedAccountForTable.startingBalance}
                      profitTarget={selectedAccountForTable.profitTarget}
                      dailyMetrics={dailyMetrics}
                      consistencyPercentage={selectedAccountForTable.consistencyPercentage}
                      resetDate={selectedAccountForTable.resetDate ? new Date(selectedAccountForTable.resetDate) : undefined}
                      onDeletePayout={async (payoutId) => {
                        try {
                          await deletePayout(payoutId)

                          // Reload the accounts data
                          const accounts = await getPropFirmAccounts(user!.id)
                          setDbAccounts(accounts)

                          // Update the selected account with new data
                          const updatedDbAccount = accounts.find(acc => acc.number === selectedAccountForTable.accountNumber)
                          if (updatedDbAccount) {
                            setSelectedAccountForTable({
                              ...selectedAccountForTable,
                              payouts: updatedDbAccount.payouts || []
                            })
                          }

                          toast({
                            title: t('propFirm.payout.deleteSuccess'),
                            description: t('propFirm.payout.deleteSuccessDescription'),
                            variant: "default"
                          })
                        } catch (error) {
                          console.error('Failed to delete payout:', error)
                          toast({
                            title: t('propFirm.payout.deleteError'),
                            description: t('propFirm.payout.deleteErrorDescription'),
                            variant: "destructive"
                          })
                        }
                      }}
                      onEditPayout={(payout) => {
                        setSelectedPayout({
                          id: payout.id,
                          date: new Date(payout.date),
                          amount: payout.amount,
                          status: payout.status
                        })
                        setPayoutDialogOpen(true)
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="configurator" className="mt-4">
                    <PropFirmConfigurator
                      account={selectedAccountForTable}
                      onUpdate={(updatedAccount) => {
                        setSelectedAccountForTable(updatedAccount)
                      }}
                      onDelete={() => {
                        setSelectedAccountForTable(null)
                      }}
                      onAccountsUpdate={(accounts) => {
                        setDbAccounts(accounts)
                      }}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>

      <PayoutDialog
        open={payoutDialogOpen}
        onOpenChange={(open) => {
          setPayoutDialogOpen(open)
          if (!open) {
            setSelectedPayout(undefined)
          }
        }}
        accountNumber={selectedAccountForTable?.accountNumber ?? ''}
        existingPayout={selectedPayout}
        onSubmit={handleAddPayout}
        onDelete={selectedPayout ? handleDeletePayout : undefined}
      />
    </Card>
  )
} 
