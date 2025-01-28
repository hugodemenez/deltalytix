'use client'

import { useState, useMemo } from 'react'
import { useFormattedTrades } from '@/components/context/trades-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from '@/locales/client'
import { Info, Settings2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ConsistencyMetrics {
  accountNumber: string
  totalProfit: number
  maxAllowedDailyProfit: number | null
  highestProfitDay: number
  isConsistent: boolean
  hasEnoughData: boolean
  hasProfitableData: boolean
  dailyPnL: { [key: string]: number }
  totalProfitableDays: number
}

export function ConsistencyTable() {
  const { formattedTrades } = useFormattedTrades()
  const t = useI18n()
  const [selectedAccount, setSelectedAccount] = useState<ConsistencyMetrics | null>(null)
  const [threshold, setThreshold] = useState(30)

  const consistencyMetrics = useMemo(() => {
    // Group trades by account and date
    const tradesByAccountAndDate = formattedTrades.reduce((acc, trade) => {
      const date = new Date(trade.entryDate).toISOString().split('T')[0]
      if (!acc[trade.accountNumber]) {
        acc[trade.accountNumber] = {}
      }
      if (!acc[trade.accountNumber][date]) {
        acc[trade.accountNumber][date] = 0
      }
      acc[trade.accountNumber][date] += trade.pnl
      return acc
    }, {} as { [key: string]: { [key: string]: number } })

    // Calculate metrics for each account
    return Object.entries(tradesByAccountAndDate).map(([accountNumber, dailyPnL]): ConsistencyMetrics => {
      // Filter to only positive PnL days
      const positiveDays = Object.entries(dailyPnL)
        .filter(([_, pnl]) => pnl > 0)
        .reduce((acc, [date, pnl]) => {
          acc[date] = pnl
          return acc
        }, {} as { [key: string]: number })

      const totalProfitableDays = Object.keys(positiveDays).length
      const totalProfit = Object.values(positiveDays).reduce((sum, pnl) => sum + pnl, 0)
      
      // Find highest profit day from positive days
      const highestProfitDay = Math.max(...Object.values(positiveDays), 0)
      
      // Can only calculate consistency if we have:
      // 1. Enough trading days (at least 5)
      // 2. Positive total profit
      const hasEnoughData = totalProfitableDays >= 5
      const hasProfitableData = totalProfit > 0

      // Calculate maximum allowed daily profit only if we have profitable data
      const maxAllowedDailyProfit = hasProfitableData ? totalProfit * (threshold / 100) : null
      
      // Account is consistent if:
      // 1. We have enough data
      // 2. We have profitable data
      // 3. Highest daily profit doesn't exceed the maximum allowed
      const isConsistent = hasEnoughData && hasProfitableData && highestProfitDay <= (maxAllowedDailyProfit ?? 0)

      return {
        accountNumber,
        totalProfit,
        maxAllowedDailyProfit,
        highestProfitDay,
        isConsistent,
        hasEnoughData,
        hasProfitableData,
        dailyPnL: positiveDays,
        totalProfitableDays
      }
    })
  }, [formattedTrades, threshold])

  const inconsistentDays = useMemo(() => {
    if (!selectedAccount || !selectedAccount.maxAllowedDailyProfit) return []
    
    return Object.entries(selectedAccount.dailyPnL)
      .filter(([_, pnl]) => pnl > selectedAccount.maxAllowedDailyProfit!)
      .sort((a, b) => b[1] - a[1]) // Sort by PnL descending
      .map(([date, pnl]) => ({
        date,
        pnl,
        percentageOfTotal: (pnl / selectedAccount.totalProfit) * 100
      }))
  }, [selectedAccount])

  return (
    <Card className="h-full w-full flex flex-col">
      <CardHeader className="flex-none pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">{t('consistency.title')}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{t('consistency.tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          {t('consistency.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <div className="h-full w-full border rounded-md overflow-hidden">
          <div className="h-full w-full">
            <div className="relative w-full h-full overflow-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 bg-background">
                  <tr>
                    <th className="h-12 px-4 text-left align-middle border-b  whitespace-normal sticky left-0 z-30 bg-background text-sm font-medium" style={{ minWidth: '150px' }}>
                      {t('consistency.account')}
                    </th>
                    <th className="h-12 px-4 text-right align-middle border-b bg-background whitespace-normal text-sm font-medium" style={{ maxWidth: '120px' }}>
                      {t('consistency.maxAllowedDailyProfit')}
                    </th>
                    <th className="h-12 px-4 text-right align-middle border-b bg-background whitespace-normal text-sm font-medium" style={{ maxWidth: '120px' }}>
                      {t('consistency.highestDailyProfit')}
                    </th>
                    <th className="h-12 px-4 text-right align-middle border-b bg-background whitespace-normal text-sm font-medium" style={{ maxWidth: '100px' }}>
                      {t('consistency.status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {consistencyMetrics.map((metrics) => {
                    const shouldHighlight = metrics.hasEnoughData && !metrics.isConsistent
                    const isInsufficientData = !metrics.hasEnoughData
                    const isUnprofitable = !metrics.hasProfitableData
                    
                    return (
                      <tr 
                        key={metrics.accountNumber} 
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          shouldHighlight && "bg-destructive/5",
                          (isInsufficientData || isUnprofitable) && "bg-muted/30"
                        )}
                        onClick={() => setSelectedAccount(metrics)}
                      >
                        <td className={cn(
                          "px-4 py-2.5 border-b whitespace-nowrap align-middle sticky left-0 z-10 text-sm",
                          shouldHighlight ? "bg-destructive/5" : (isInsufficientData || isUnprofitable) ? "bg-muted/30" : "bg-background"
                        )} style={{ minWidth: '150px' }}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              isInsufficientData || isUnprofitable ? "bg-muted" : 
                              shouldHighlight ? "bg-destructive" : "bg-green-500"
                            )} />
                            {metrics.accountNumber}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 border-b whitespace-nowrap align-middle text-right text-sm">
                          {metrics.maxAllowedDailyProfit ? `$${metrics.maxAllowedDailyProfit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 border-b whitespace-nowrap align-middle text-right text-sm">
                          ${metrics.highestProfitDay.toFixed(2)}
                        </td>
                        <td className={cn(
                          "px-4 py-2.5 border-b whitespace-nowrap align-middle text-right font-medium text-sm",
                          isInsufficientData ? "text-muted-foreground italic" : 
                          isUnprofitable ? "text-muted-foreground italic" :
                          !metrics.isConsistent ? "text-destructive" : "text-green-500"
                        )}>
                          {isInsufficientData ? 
                            t('consistency.insufficientData') : 
                            isUnprofitable ?
                            t('consistency.unprofitable') :
                            !metrics.isConsistent ? t('consistency.inconsistent') : t('consistency.consistent')
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Dialog open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-medium">
                {selectedAccount && t('consistency.modal.title', { account: selectedAccount.accountNumber })}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t('consistency.modal.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm font-medium">{t('consistency.modal.date')}</TableHead>
                    <TableHead className="text-right text-sm font-medium">{t('consistency.modal.pnl')}</TableHead>
                    <TableHead className="text-right text-sm font-medium">{t('consistency.modal.percentageOfTotal')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inconsistentDays.map(({ date, pnl, percentageOfTotal }) => (
                    <TableRow key={date}>
                      <TableCell className="text-sm">{format(new Date(date), 'PP')}</TableCell>
                      <TableCell className="text-right text-sm">${pnl.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">{percentageOfTotal.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
      <div className="px-6 py-3 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 w-[200px]">
            <Slider
              value={[threshold]}
              onValueChange={([value]) => setThreshold(value)}
              max={100}
              min={1}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-9">{threshold}%</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground text-sm">{t('consistency.consistent')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground text-sm">{t('consistency.inconsistent')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <span className="text-muted-foreground text-sm">{t('consistency.insufficientData')}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
} 