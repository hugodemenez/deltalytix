'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { setupPropFirmAccount, getPropFirmAccounts, addPropFirmPayout, deletePayout, updatePayout } from '@/app/[locale]/(dashboard)/dashboard/data/actions'
import { useI18n } from "@/locales/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AccountTable } from './account-table'
import { toast } from "@/hooks/use-toast"
import { WidgetSize } from '../../types/dashboard'
import { enUS, fr } from 'date-fns/locale'
import { useParams } from 'next/navigation'

interface PropFirmAccount {
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

type PendingChanges = Omit<Partial<PropFirmAccount>, 'resetDate'> & {
  resetDate?: Date | undefined;
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

function ensureDateOrUndefined(date: Date | null | undefined): Date | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date : new Date(date);
}

function getSelectedDate(pendingDate: Date | undefined | null, existingDate: Date | null | undefined): Date | undefined {
  if (pendingDate instanceof Date) return pendingDate;
  if (existingDate) return new Date(existingDate);
  return undefined;
}

function getDisplayDate(pendingChanges: PendingChanges | null, selectedAccount: PropFirmAccount | null): Date | undefined {
  if (pendingChanges?.resetDate instanceof Date) return pendingChanges.resetDate;
  if (selectedAccount?.resetDate) return new Date(selectedAccount.resetDate);
  return undefined;
}

export function PropFirmOverview({ size }: { size: WidgetSize }) {
  const { trades, user } = useUserData()
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const [dbAccounts, setDbAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<ConsistencyMetrics | null>(null)
  const [selectedAccountForTable, setSelectedAccountForTable] = useState<PropFirmAccount | null>(null)
  const [pendingChanges, setPendingChanges] = useState<PendingChanges | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<{
    id: string;
    date: Date;
    amount: number;
    status: string;
  } | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)

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

  const propFirmAccounts = useMemo(() => {
    const uniqueAccounts = new Set(trades.map(trade => trade.accountNumber))
    return Array.from(uniqueAccounts).map(accountNumber => {
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
  }, [trades, dbAccounts])

  const consistencyMetrics = useMemo(() => {
    return propFirmAccounts.map(account => {
      const accountTrades = trades.filter(t => t.accountNumber === account.accountNumber)
      const dailyPnL: { [key: string]: number } = {}
      
      // First calculate total profit including commissions
      const totalProfit = accountTrades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)
      const hasProfitableData = totalProfit > 0
      
      // Then calculate daily PnLs
      accountTrades.forEach(trade => {
        const date = new Date(trade.entryDate).toISOString().split('T')[0]
        if (!dailyPnL[date]) dailyPnL[date] = 0
        dailyPnL[date] += trade.pnl - (trade.commission || 0)
      })

      const highestProfitDay = Math.max(...Object.values(dailyPnL))
      
      // Only calculate consistency metrics if we have profitable data
      if (hasProfitableData) {
        const maxAllowedDailyProfit = totalProfit * (account.consistencyPercentage / 100)
        const isConsistent = highestProfitDay <= maxAllowedDailyProfit

        return {
          accountNumber: account.accountNumber,
          totalProfit,
          maxAllowedDailyProfit,
          highestProfitDay,
          isConsistent,
          hasProfitableData,
          dailyPnL,
          totalProfitableDays: Object.values(dailyPnL).filter(pnl => pnl > 0).length
        }
      }

      // Return default values for unprofitable accounts
      return {
        accountNumber: account.accountNumber,
        totalProfit,
        maxAllowedDailyProfit: null,
        highestProfitDay,
        isConsistent: false,
        hasProfitableData,
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

  // Add this function to handle scroll events
  function handleScroll(e: React.WheelEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    const isAtTop = target.scrollTop === 0;
    const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
    
    // Prevent scroll propagation at boundaries
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Add this function to handle both add and update
  const handleAddPayout = async (payout: Payout) => {
    if (!selectedAccountForTable || !user) return
    
    try {
      setIsSaving(true)
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
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePayout = async () => {
    if (!selectedAccountForTable || !user || !selectedPayout) return
    
    try {
      setIsSaving(true)
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
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>{t('propFirm.title')}</CardTitle>
          <CardDescription>{t('propFirm.description')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="flex-none">
            <TabsTrigger value="overview">{t('propFirm.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="consistency">{t('propFirm.tabs.consistency')}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex-1 overflow-hidden data-[state=active]:flex flex-col">
            <div 
              className="flex-1 overflow-y-auto h-full"
              onWheel={handleScroll}
              style={{ height: 'calc(100% - 1rem)', overscrollBehavior: 'contain' }}
            >
              <div className={cn("grid grid-cols-1 gap-3 mt-4", size === "medium" ? "sm:grid-cols-2" : size === "large" ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
                {propFirmAccounts.map(account => {
                  const metrics = consistencyMetrics.find(m => m.accountNumber === account.accountNumber)
                  const progress = account.profitTarget > 0 
                    ? (account.balanceToDate / account.profitTarget) * 100
                    : 0
                  const isConfigured = account.profitTarget > 0 && account.drawdownThreshold > 0

                  return (
                    <Card 
                      key={account.accountNumber} 
                      className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedAccountForTable(account)}
                    >
                      <CardHeader className="flex-none p-3 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="truncate">
                              <CardTitle className="text-sm truncate flex items-center gap-2">
                               <div className={cn(
                              "h-2 w-2 rounded-full",
                              !metrics?.hasProfitableData ? "bg-muted" :
                              !metrics?.isConsistent ? "bg-destructive" : "bg-green-500"
                            )} />
                                {account.propfirm || "Unnamed Account"}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground truncate">
                                {account.accountNumber}
                              </p>
                            </div>
                          </div>
                          {/* {isConfigured && metrics && (
                            <Badge 
                              variant={metrics.isConsistent ? "default" : "destructive"}
                              className="text-xs whitespace-nowrap"
                            >
                              {metrics.isConsistent ? t('consistency.consistent') : t('consistency.inconsistent')}
                            </Badge>
                          )} */}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 p-3 pt-0 space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">{t('propFirm.balance')}</span>
                          <span className="text-base font-semibold truncate ml-2">${account.balanceToDate.toFixed(2)}</span>
                        </div>
                        {isConfigured ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t('propFirm.target')}</span>
                              <span>${account.profitTarget.toFixed(2)}</span>
                            </div>
                            <Progress 
                              value={progress} 
                              className="h-1.5" 
                              indicatorClassName={cn(
                                "transition-colors duration-300",
                                "bg-[hsl(var(--chart-6))]",
                                progress <= 20 ? "opacity-20" :
                                progress <= 40 ? "opacity-40" :
                                progress <= 60 ? "opacity-60" :
                                progress <= 80 ? "opacity-80" :
                                "opacity-100"
                              )}
                            />
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t('propFirm.drawdown')}</span>
                              <span>{account.drawdownThreshold}$</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center pt-2">
                            {t('propFirm.setup.message')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="consistency" className="flex-1 overflow-hidden data-[state=active]:flex flex-col">
            <div 
              className="flex-1 overflow-y-auto h-full"
              onWheel={handleScroll}
              style={{ height: 'calc(100% - 1rem)', overscrollBehavior: 'contain' }}
            >
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">{t('consistency.account')}</TableHead>
                      <TableHead className="text-right">{t('consistency.maxAllowedDailyProfit')}</TableHead>
                      <TableHead className="text-right">{t('consistency.highestDailyProfit')}</TableHead>
                      <TableHead className="text-right">{t('consistency.modal.percentageOfTotal')}</TableHead>
                      <TableHead className="text-right">{t('consistency.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consistencyMetrics.map(metrics => {
                      const shouldHighlight = metrics.hasProfitableData && !metrics.isConsistent
                      const isInsufficientData = !metrics.hasProfitableData
                      const isUnprofitable = !metrics.hasProfitableData
                      const highestProfitPercentage = metrics.totalProfit > 0 
                        ? (metrics.highestProfitDay / metrics.totalProfit) * 100 
                        : 0
                      
                      return (
                        <TableRow 
                          key={metrics.accountNumber}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            !metrics.isConsistent && metrics.hasProfitableData && "bg-destructive/5",
                            !metrics.hasProfitableData && "bg-muted/30"
                          )}
                          onClick={() => setSelectedAccount(metrics)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                isUnprofitable ? "bg-muted" : 
                                shouldHighlight ? "bg-destructive" : "bg-green-500"
                              )} />
                              {metrics.accountNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {metrics.maxAllowedDailyProfit ? `$${metrics.maxAllowedDailyProfit.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            ${metrics.highestProfitDay.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {highestProfitPercentage > 0 ? `${highestProfitPercentage.toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-medium",
                            isUnprofitable ? "text-muted-foreground italic" :
                            !metrics.isConsistent ? "text-destructive" : "text-green-500"
                          )}>
                            {!metrics?.hasProfitableData ? t('propFirm.status.unprofitable') :
                              metrics?.isConsistent ? t('propFirm.status.consistent') : t('propFirm.status.inconsistent')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
          <DialogContent className="max-w-7xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedAccount && t('consistency.modal.title', { account: selectedAccount.accountNumber })}
              </DialogTitle>
              <DialogDescription>
                {t('consistency.modal.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('consistency.modal.date')}</TableHead>
                    <TableHead className="text-right">{t('consistency.modal.pnl')}</TableHead>
                    <TableHead className="text-right">{t('consistency.modal.percentageOfTotal')}</TableHead>
                    <TableHead className="text-right">{t('consistency.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyPnLPercentages.map(({ date, pnl, percentageOfTotal, isConsistent }) => (
                    <TableRow 
                      key={date}
                      className={cn(
                        !isConsistent && "bg-destructive/5"
                      )}
                    >
                      <TableCell>{format(new Date(date), 'PP')}</TableCell>
                      <TableCell className="text-right">${pnl.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{percentageOfTotal.toFixed(1)}%</TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        isConsistent ? "text-green-500" : "text-destructive"
                      )}>
                        {isConsistent ? t('propFirm.status.consistent') : t('propFirm.status.inconsistent')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog 
          open={!!selectedAccountForTable} 
          onOpenChange={(open) => !open && setSelectedAccountForTable(null)}
        >
          <DialogContent className="max-w-7xl h-[80vh] flex flex-col">
            <DialogHeader className="p-6 pb-4 flex-none border-b">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t('propFirm.accountName')}
                      value={pendingChanges?.propfirm ?? selectedAccountForTable?.propfirm ?? ""}
                      onChange={(e) => setPendingChanges(prev => ({
                        ...prev,
                        propfirm: e.target.value
                      }))}
                      className="max-w-[300px]"
                    />
                    <DialogDescription>
                      {selectedAccountForTable?.accountNumber}
                    </DialogDescription>
                  </div>
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
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>{t('propFirm.accountSize')}</Label>
                    <Input
                      type="number"
                      value={pendingChanges?.startingBalance ?? selectedAccountForTable?.startingBalance ?? 0}
                      onChange={(e) => setPendingChanges(prev => ({
                        ...prev,
                        startingBalance: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('propFirm.target')}</Label>
                    <Input
                      type="number"
                      value={pendingChanges?.profitTarget ?? selectedAccountForTable?.profitTarget ?? 0}
                      onChange={(e) => setPendingChanges(prev => ({
                        ...prev,
                        profitTarget: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('propFirm.drawdown')}</Label>
                    <Input
                      type="number"
                      value={pendingChanges?.drawdownThreshold ?? selectedAccountForTable?.drawdownThreshold ?? 0}
                      onChange={(e) => setPendingChanges(prev => ({
                        ...prev,
                        drawdownThreshold: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t('propFirm.coherence')}</Label>
                    <Input
                      type="number"
                      value={pendingChanges?.consistencyPercentage ?? selectedAccountForTable?.consistencyPercentage ?? 30}
                      onChange={(e) => setPendingChanges(prev => ({
                        ...prev,
                        consistencyPercentage: parseFloat(e.target.value)
                      }))}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>{t('propFirm.resetDate.label')}</Label>
                    <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <DialogTrigger asChild>
                        <div className="relative w-full">
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal pr-10",
                              !pendingChanges?.resetDate && !selectedAccountForTable?.resetDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {getDisplayDate(pendingChanges, selectedAccountForTable) ? (
                              format(getDisplayDate(pendingChanges, selectedAccountForTable)!, 'PPP', { locale: localeMap[params.locale as string] })
                            ) : (
                              <span>{t('propFirm.resetDate.noDate')}</span>
                            )}
                          </Button>
                          {(pendingChanges?.resetDate || selectedAccountForTable?.resetDate) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full hover:bg-transparent"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Update UI state
                                setPendingChanges(prev => ({
                                  ...prev,
                                  resetDate: undefined
                                }));
                                // Also update the selected account to reflect change immediately
                                if (selectedAccountForTable) {
                                  setSelectedAccountForTable({
                                    ...selectedAccountForTable,
                                    resetDate: null
                                  });
                                }
                                // Immediately save the change if there's an existing account
                                if (selectedAccountForTable && user) {
                                  setIsSaving(true);
                                  setupPropFirmAccount({
                                    ...selectedAccountForTable,
                                    userId: user.id,
                                    resetDate: null
                                  }).then(async () => {
                                    // Reload the accounts data
                                    const accounts = await getPropFirmAccounts(user.id);
                                    setDbAccounts(accounts);
                                    setIsSaving(false);
                                    // Clear pending changes after successful save
                                    setPendingChanges(null);
                                    toast({
                                      title: t('propFirm.toast.setupSuccess'),
                                      description: t('propFirm.toast.setupSuccessDescription'),
                                      variant: "default"
                                    });
                                  }).catch(error => {
                                    console.error('Failed to clear reset date:', error);
                                    setIsSaving(false);
                                    toast({
                                      title: t('error'),
                                      description: t('propFirm.toast.setupError'),
                                      variant: "destructive"
                                    });
                                  });
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>{t('propFirm.resetDate.title')}</DialogTitle>
                          <DialogDescription>
                            {t('propFirm.resetDate.description')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-6">
                          <Calendar
                            mode="single"
                            numberOfMonths={2}
                            showOutsideDays={true}
                            fixedWeeks={true}
                            selected={getSelectedDate(pendingChanges?.resetDate, selectedAccountForTable?.resetDate)}
                            onSelect={(date) => {
                              setPendingChanges(prev => ({
                                ...prev,
                                resetDate: date || undefined
                              }));
                              setCalendarOpen(false);
                            }}
                            initialFocus
                            locale={localeMap[params.locale as string]}
                            className="mx-auto"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedAccountForTable && (
                <AccountTable
                  accountNumber={selectedAccountForTable.accountNumber}
                  startingBalance={pendingChanges?.startingBalance ?? selectedAccountForTable.startingBalance}
                  profitTarget={pendingChanges?.profitTarget ?? selectedAccountForTable.profitTarget}
                  dailyMetrics={dailyMetrics}
                  consistencyPercentage={selectedAccountForTable.consistencyPercentage}
                  resetDate={pendingChanges?.resetDate ?? (selectedAccountForTable.resetDate ? new Date(selectedAccountForTable.resetDate) : undefined)}
                  hasPendingChanges={!!pendingChanges}
                  onDeletePayout={async (payoutId) => {
                    try {
                      setIsSaving(true)
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
                    } finally {
                      setIsSaving(false)
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
              )}
            </div>

            {pendingChanges && (
              <div className="flex-none p-6 border-t">
                <Button 
                  className="w-full"
                  disabled={!pendingChanges || Object.keys(pendingChanges).length === 0 || Object.values(pendingChanges).some(value => 
                    typeof value === 'number' && value <= 0
                  ) || isSaving}
                  onClick={async () => {
                    if (!selectedAccountForTable || !user || !pendingChanges) return
                    
                    // Validate that any numeric values are positive
                    if (Object.values(pendingChanges).some(value => 
                      typeof value === 'number' && value <= 0
                    )) {
                      toast({
                        title: t('error'),
                        description: t('propFirm.toast.validationPositive'),
                        variant: "destructive"
                      })
                      return
                    }
                    
                    try {
                      setIsSaving(true)
                      const accountUpdate = {
                        ...selectedAccountForTable,
                        userId: user.id,
                        startingBalance: pendingChanges?.startingBalance ?? selectedAccountForTable.startingBalance,
                        profitTarget: pendingChanges?.profitTarget ?? selectedAccountForTable.profitTarget,
                        drawdownThreshold: pendingChanges?.drawdownThreshold ?? selectedAccountForTable.drawdownThreshold,
                        consistencyPercentage: pendingChanges?.consistencyPercentage ?? selectedAccountForTable.consistencyPercentage,
                        propfirm: pendingChanges?.propfirm ?? selectedAccountForTable.propfirm,
                        resetDate: pendingChanges?.resetDate instanceof Date ? pendingChanges.resetDate : undefined
                      };

                      await setupPropFirmAccount(accountUpdate)
                      
                      // Reload the accounts data
                      const accounts = await getPropFirmAccounts(user.id)
                      setDbAccounts(accounts)
                      
                      // Update the selected account with new data
                      const updatedDbAccount = accounts.find(acc => acc.number === selectedAccountForTable.accountNumber)
                      if (updatedDbAccount) {
                        setSelectedAccountForTable({
                          ...selectedAccountForTable,
                          startingBalance: updatedDbAccount.startingBalance,
                          profitTarget: updatedDbAccount.profitTarget,
                          drawdownThreshold: updatedDbAccount.drawdownThreshold,
                          consistencyPercentage: updatedDbAccount.consistencyPercentage ?? 30,
                          propfirm: updatedDbAccount.propfirm,
                          trailingStopProfit: updatedDbAccount.trailingStopProfit ?? 0,
                          resetDate: updatedDbAccount.resetDate ? new Date(updatedDbAccount.resetDate) : null
                        })
                      }
                      
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
                  }}
                >
                  {isSaving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            )}
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
