'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Info, Plus, X, Clock, CheckCircle, XCircle, DollarSign, Trash2, Save, Settings } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, Locale } from "date-fns"
import { cn } from "@/lib/utils"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { AccountTable } from './account-table'
import { toast } from "@/hooks/use-toast"
import { WidgetSize } from '../../types/dashboard'
import { enUS, fr } from 'date-fns/locale'
import { useParams } from 'next/navigation'
import { AccountCard } from './account-card'
import { AccountConfigurator } from './account-configurator'
import { AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogDescription, AlertDialogTitle, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Account } from '@/context/data-provider'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { savePayoutAction } from '@/server/accounts'

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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-w-3xl sm:max-h-[75vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingPayout ? t('propFirm.payout.edit') : t('propFirm.payout.add')}</DialogTitle>
          <DialogDescription>
            {existingPayout ? t('propFirm.payout.editDescription') : t('propFirm.payout.addDescription')} {accountNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 py-4">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label>{t('propFirm.payout.date')}</Label>
              <p className="text-sm text-muted-foreground">
                {format(date, 'PPP', { locale: localeMap[params.locale as string] })}
              </p>
            </div>
            <div className="flex justify-center rounded-md border overflow-hidden">
              <Calendar
                mode="single"
                numberOfMonths={1}
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
                className="rounded-md w-full"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('propFirm.payout.status')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={status === option.value ? "default" : "outline"}
                  className="justify-start text-xs sm:text-sm"
                  onClick={() => setStatus(option.value)}
                >
                  {option.icon}
                  <span className="ml-1 sm:ml-2 truncate">{option.label}</span>
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

export function AccountsOverview({ size }: { size: WidgetSize }) {
  const trades = useTradesStore(state => state.trades)
  const user = useUserStore(state => state.user)
  const groups = useUserStore(state => state.groups)
  const accounts = useUserStore(state => state.accounts)
  const { accountNumbers, setAccountNumbers, deletePayout, deleteAccount, saveAccount, savePayout } = useData()
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const [selectedAccountForTable, setSelectedAccountForTable] = useState<Account | null>(null)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<{
    id: string;
    date: Date;
    amount: number;
    status: string;
  } | undefined>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [canDeleteAccount, setCanDeleteAccount] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Partial<Account> | null>(null)

  // Enable delete button when an account is selected
  useEffect(() => {
    setCanDeleteAccount(!!selectedAccountForTable)
  }, [selectedAccountForTable])

  const { filteredAccounts, unconfiguredAccounts } = useMemo(() => {
    const uniqueAccounts = new Set(trades.map(trade => trade.accountNumber))
    // Find the hidden group
    const hiddenGroup = groups.find(g => g.name === "Hidden Accounts")
    const hiddenAccountNumbers = hiddenGroup ? new Set(hiddenGroup.accounts.map(a => a.number)) : new Set()

    const configuredAccounts: Account[] = []
    const unconfiguredAccounts: string[] = []

    Array.from(uniqueAccounts)
      .filter(accountNumber =>
        (accountNumbers.length === 0 || accountNumbers.includes(accountNumber)) &&
        !hiddenAccountNumbers.has(accountNumber)
      )
      .forEach(accountNumber => {
        const accountTrades = trades.filter(t => t.accountNumber === accountNumber)
        const dbAccount = accounts.find(acc => acc.number === accountNumber)

        if (dbAccount) {
          // Filter trades based on reset date if it exists
          const relevantTrades = dbAccount.resetDate
            ? accountTrades.filter(t => new Date(t.entryDate) >= new Date(dbAccount.resetDate!))
            : accountTrades

          const balance = relevantTrades.reduce((total, trade) => total + trade.pnl - (trade.commission || 0), 0)
          const totalPayouts = dbAccount.payouts?.reduce((sum: number, payout: { status: string, amount: number }) =>
            sum + (payout.status === 'PAID' ? payout.amount : 0), 0) || 0

          configuredAccounts.push({
            ...dbAccount,
            balanceToDate: balance - totalPayouts,
            payouts: dbAccount.payouts ?? []
          })
        } else {
          // Account exists in trades but not configured in database
          unconfiguredAccounts.push(accountNumber)
        }
      })

    return { filteredAccounts: configuredAccounts, unconfiguredAccounts }
  }, [trades, accounts, accountNumbers, groups])

  const consistencyMetrics = useMemo(() => {
    return filteredAccounts.map(account => {
      // Filter trades based on reset date if it exists
      const relevantTrades = account.resetDate
        ? trades.filter(t => t.accountNumber === account.number && new Date(t.entryDate) >= new Date(account.resetDate!))
        : trades.filter(t => t.accountNumber === account.number)

      const dailyPnL: { [key: string]: number } = {}

      // First calculate total profit including commissions
      const totalProfit = relevantTrades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)
      const hasProfitableData = totalProfit > 0

      // Check if account is properly configured
      const isConfigured = (account.profitTarget ?? 0) > 0 && (account.consistencyPercentage ?? 0) > 0

      // Then calculate daily PnLs
      relevantTrades.forEach(trade => {
        const date = new Date(trade.entryDate).toISOString().split('T')[0]
        if (!dailyPnL[date]) dailyPnL[date] = 0
        dailyPnL[date] += trade.pnl - (trade.commission || 0)
      })

      const highestProfitDay = Math.max(...Object.values(dailyPnL))

      // Only calculate consistency metrics if we have profitable data and account is configured
      if (hasProfitableData && isConfigured) {
        // Use profit target as base until profits exceed it
        const baseAmount = totalProfit <= (account.profitTarget ?? 0)
          ? (account.profitTarget ?? 0)
          : totalProfit

        const maxAllowedDailyProfit = baseAmount * ((account.consistencyPercentage ?? 0) / 100)
        const isConsistent = highestProfitDay <= maxAllowedDailyProfit

        return {
          accountNumber: account.number,
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
        accountNumber: account.number,
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
  }, [trades, filteredAccounts])

  const dailyMetrics = useMemo(() => {
    if (!selectedAccountForTable) return []

    // Filter trades based on reset date if it exists
    const relevantTrades = selectedAccountForTable.resetDate
      ? trades.filter(t => t.accountNumber === selectedAccountForTable.number && new Date(t.entryDate) >= new Date(selectedAccountForTable.resetDate!))
      : trades.filter(t => t.accountNumber === selectedAccountForTable.number)

    const dailyPnL: { [key: string]: number[] } = {}

    // Calculate total profit first
    const totalProfit = relevantTrades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)

    // First, get all unique dates from both trades and payouts
    const allDates = new Set<string>()

    // Add trade dates
    relevantTrades.forEach(trade => {
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

  const handleAddPayout = async (payout: Payout) => {
    console.log('handleAddPayout', payout)
    if (!selectedAccountForTable || !user) return

    try {
      if (selectedPayout) {
        // Update existing payout
        //TODO: Update payout
      } else {
        // Add new payout
        await savePayout({
          ...payout,
          id: '', // Will be generated by the server
          accountNumber: selectedAccountForTable.number,
          createdAt: new Date(),
          accountId: selectedAccountForTable.id
        })
      }
      // Update the selected account with new data
      const updatedDbAccount = accounts.find(acc => acc.number === selectedAccountForTable.number)
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
      await deleteAccount(selectedAccountForTable)
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

  const handleSave = async () => {
    if (!user || !selectedAccountForTable || !pendingChanges) return

    try {
      setIsSaving(true)
      const accountUpdate = {
        ...selectedAccountForTable,
        userId: user.id,
        ...pendingChanges,
        startingBalance: pendingChanges?.startingBalance ?? selectedAccountForTable.startingBalance,
        profitTarget: pendingChanges?.profitTarget ?? selectedAccountForTable.profitTarget,
        drawdownThreshold: pendingChanges?.drawdownThreshold ?? selectedAccountForTable.drawdownThreshold,
        consistencyPercentage: pendingChanges?.consistencyPercentage ?? selectedAccountForTable.consistencyPercentage,
        propfirm: pendingChanges?.propfirm ?? selectedAccountForTable.propfirm,
        resetDate: pendingChanges?.resetDate instanceof Date ? pendingChanges.resetDate : null,
        trailingDrawdown: pendingChanges?.trailingDrawdown ?? selectedAccountForTable.trailingDrawdown,
        trailingStopProfit: pendingChanges?.trailingStopProfit ?? selectedAccountForTable.trailingStopProfit,
        accountSize: pendingChanges?.accountSize ?? selectedAccountForTable.accountSize,
        accountSizeName: pendingChanges?.accountSizeName ?? selectedAccountForTable.accountSizeName,
        price: pendingChanges?.price ?? selectedAccountForTable.price,
        priceWithPromo: pendingChanges?.priceWithPromo ?? selectedAccountForTable.priceWithPromo,
        evaluation: pendingChanges?.evaluation ?? selectedAccountForTable.evaluation,
        minDays: pendingChanges?.minDays ?? selectedAccountForTable.minDays,
        dailyLoss: pendingChanges?.dailyLoss ?? selectedAccountForTable.dailyLoss,
        rulesDailyLoss: pendingChanges?.rulesDailyLoss ?? selectedAccountForTable.rulesDailyLoss,
        trailing: pendingChanges?.trailing ?? selectedAccountForTable.trailing,
        tradingNewsAllowed: pendingChanges?.tradingNewsAllowed ?? selectedAccountForTable.tradingNewsAllowed,
        activationFees: pendingChanges?.activationFees ?? selectedAccountForTable.activationFees,
        isRecursively: pendingChanges?.isRecursively ?? selectedAccountForTable.isRecursively,
        balanceRequired: pendingChanges?.balanceRequired ?? selectedAccountForTable.balanceRequired,
        minTradingDaysForPayout: pendingChanges?.minTradingDaysForPayout ?? selectedAccountForTable.minTradingDaysForPayout
      }
      await saveAccount(accountUpdate)

      // Update the selected account
      setSelectedAccountForTable(accountUpdate)

      setPendingChanges(null)

      toast({
        title: t('propFirm.toast.setupSuccess'),
        description: t('propFirm.toast.setupSuccessDescription'),
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to setup account:', error)
      toast({
        title: t('propFirm.toast.setupError'),
        description: t('propFirm.toast.setupErrorDescription'),
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
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

      {/* Unconfigured accounts banner */}
      {unconfiguredAccounts.length > 0 && (
        <div className="border-b border-orange-200/30 bg-orange-50/40 dark:border-orange-700/30 dark:bg-orange-950/30">
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {t('propFirm.status.needsConfiguration')}:
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {unconfiguredAccounts.map((accountNumber, index) => (
                  <div
                    key={accountNumber}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/50"
                  >
                    <span className="text-xs font-medium text-orange-800 dark:text-orange-200">
                      {accountNumber}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-orange-200 dark:hover:bg-orange-800/50"
                      onClick={() => {
                        // Create a minimal account object for configuration
                        const tempAccount = {
                          id: '',
                          userId: user?.id || '',
                          number: accountNumber,
                          propfirm: '',
                          startingBalance: 0,
                          profitTarget: 0,
                          drawdownThreshold: 0,
                          consistencyPercentage: 30,
                          resetDate: null,
                          payouts: [],
                          balanceToDate: 0
                        }
                        // Use type assertion to work around the type issues
                        setSelectedAccountForTable(tempAccount as any)
                      }}
                    >
                      <Settings className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent className="flex-1 overflow-hidden">
        <div
          className="flex-1 overflow-y-auto h-full"
        >
          {/* Group accounts by their groups */}
          <div className="mt-4">
            <div className="space-y-6">
              {groups.map((group, groupIndex) => {
                // Filter accounts for this group
                const groupAccounts = filteredAccounts.filter(account => {
                  // Find the account in the group's accounts
                  return group.accounts.some(a => a.number === account.number);
                });

                // Skip groups with no accounts
                if (groupAccounts.length === 0) return null;

                // Generate a consistent color for each group based on group index
                const groupColors = [
                  'border-blue-200/50 bg-blue-50/30 dark:border-blue-800/30 dark:bg-blue-950/20',
                  'border-purple-200/50 bg-purple-50/30 dark:border-purple-800/30 dark:bg-purple-950/20',
                  'border-green-200/50 bg-green-50/30 dark:border-green-800/30 dark:bg-green-950/20',
                  'border-orange-200/50 bg-orange-50/30 dark:border-orange-800/30 dark:bg-orange-950/20',
                  'border-pink-200/50 bg-pink-50/30 dark:border-pink-800/30 dark:bg-pink-950/20',
                  'border-cyan-200/50 bg-cyan-50/30 dark:border-cyan-800/30 dark:bg-cyan-950/20',
                ];

                const groupColorClass = groupColors[groupIndex % groupColors.length];

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "relative border-l-4 rounded-r-lg",
                      groupColorClass,
                      "transition-all duration-200 hover:shadow-md"
                    )}
                  >
                    {/* Group header with subtle styling */}
                    <div className="px-4 py-3 border-b border-current/10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground/80 tracking-wide uppercase">
                          {group.name}
                        </h3>
                        <div className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full">
                          {groupAccounts.length} {groupAccounts.length === 1 ? 'account' : 'accounts'}
                        </div>
                      </div>
                    </div>

                    {/* Cards container with optimized spacing */}
                    <div className="p-4 pt-3">
                      <div className="flex gap-3 overflow-x-auto pb-2 min-h-fit">
                        {groupAccounts.map(account => {
                          const metrics = consistencyMetrics.find(m => m.accountNumber === account.number)
                          // Filter trades based on reset date if it exists (for metrics)
                          const accountTrades = account.resetDate
                            ? trades.filter(t => t.accountNumber === account.number && new Date(t.entryDate) >= new Date(account.resetDate!))
                            : trades.filter(t => t.accountNumber === account.number)
                          // All trades for the chart
                          const allAccountTrades = trades.filter(t => t.accountNumber === account.number)
                          if (!account.number) return null;
                          return (
                            <div key={account.number} className="flex-shrink-0">
                              <AccountCard
                                account={account as Account}
                                trades={accountTrades}
                                allTrades={allAccountTrades}
                                metrics={metrics}
                                onClick={() => setSelectedAccountForTable(account as Account)}
                                size={size}
                              />
                            </div>
                          )
                        }).filter(Boolean)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Show ungrouped accounts */}
              {(() => {

                const groupedAccountNumbers = new Set(
                  groups.flatMap(group => group.accounts.map(a => a.number))
                );

                const ungroupedAccounts = filteredAccounts.filter(
                  account => !groupedAccountNumbers.has(account.number ?? '')
                );

                if (ungroupedAccounts.length === 0) return null;

                return (
                  <div
                    className={cn(
                      "relative border-l-4 border-gray-200/50 bg-gray-50/30 dark:border-gray-700/30 dark:bg-gray-900/20 rounded-r-lg",
                      "transition-all duration-200 hover:shadow-md"
                    )}
                  >
                    {/* Ungrouped header */}
                    <div className="px-4 py-3 border-b border-gray-200/20 dark:border-gray-700/20">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                          {t('propFirm.ungrouped')}
                        </h3>
                        <div className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full">
                          {ungroupedAccounts.length} {ungroupedAccounts.length === 1 ? 'account' : 'accounts'}
                        </div>
                      </div>
                    </div>

                    {/* Cards container */}
                    <div className="p-4 pt-3">
                      <div className="flex gap-3 overflow-x-auto pb-2 min-h-fit">
                        {ungroupedAccounts.map(account => {
                          const metrics = consistencyMetrics.find(m => m.accountNumber === account.number)
                          // Filter trades based on reset date if it exists (for metrics)
                          const accountTrades = account.resetDate
                            ? trades.filter(t => t.accountNumber === account.number && new Date(t.entryDate) >= new Date(account.resetDate!))
                            : trades.filter(t => t.accountNumber === account.number)
                          // All trades for the chart
                          const allAccountTrades = trades.filter(t => t.accountNumber === account.number)
                          if (!account.number) return null;
                          return (
                            <div key={account.number} className="flex-shrink-0">
                              <AccountCard
                                account={account as Account}
                                trades={accountTrades}
                                allTrades={allAccountTrades}
                                metrics={metrics}
                                onClick={() => setSelectedAccountForTable(account as Account)}
                                size={size}
                              />
                            </div>
                          )
                        }).filter(Boolean)}
                      </div>
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
                  <DialogTitle>{t('propFirm.configurator.title', { accountNumber: selectedAccountForTable?.number })}</DialogTitle>
                  <DialogDescription>{t('propFirm.configurator.description')}</DialogDescription>
                </div>
                <div className="flex items-center gap-2 pr-4">

                  <Button
                    variant="default"
                    onClick={handleSave}
                    disabled={pendingChanges === null}
                  >
                    {isSaving ? t('common.saving') : t('common.save')}
                  </Button>
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
                        {t('propFirm.common.delete')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('propFirm.delete.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('propFirm.delete.description', { account: selectedAccountForTable?.number })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('propFirm.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? t('propFirm.common.deleting') : t('propFirm.common.delete')}
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
                    <TabsTrigger value="table">{t('propFirm.table.title')}</TabsTrigger>
                    <TabsTrigger value="configurator">{t('propFirm.table.configurator')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="table" className="mt-4">
                    <AccountTable
                      accountNumber={selectedAccountForTable.number}
                      startingBalance={selectedAccountForTable.startingBalance}
                      profitTarget={selectedAccountForTable.profitTarget}
                      dailyMetrics={dailyMetrics}
                      consistencyPercentage={selectedAccountForTable.consistencyPercentage ?? 30}
                      resetDate={selectedAccountForTable.resetDate ? new Date(selectedAccountForTable.resetDate) : undefined}
                      onDeletePayout={async (payoutId) => {
                        try {
                          deletePayout(payoutId)

                          // Update the selected account with new data
                          const updatedDbAccount = accounts.find(acc => acc.number === selectedAccountForTable.number)
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
                    <AccountConfigurator
                      account={selectedAccountForTable}
                      pendingChanges={pendingChanges as Partial<Account> | null}
                      setPendingChanges={setPendingChanges}
                      isSaving={isSaving}
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
        accountNumber={selectedAccountForTable?.number ?? ''}
        existingPayout={selectedPayout}
        onSubmit={handleAddPayout}
        onDelete={selectedPayout ? handleDeletePayout : undefined}
      />
    </Card>
  )
} 
