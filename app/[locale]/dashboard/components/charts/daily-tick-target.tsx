"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, HelpCircle, Plus, Minus, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { useDailyTickTargetStore } from "@/store/daily-tick-target-store"
import { useTickDetailsStore } from "@/store/tick-details-store"
import { useEffect, useState } from "react"

interface DailyTickTargetProps {
  size?: WidgetSize
}

export default function DailyTickTargetChart({ size = 'medium' }: DailyTickTargetProps) {
  const { formattedTrades: trades, dateRange } = useData()
  const t = useI18n()
  const tickDetails = useTickDetailsStore(state => state.tickDetails)
  const [targetValue, setTargetValue] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  // Add selectedDate state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  const { 
    getTodayTarget, 
    getTodayProgress, 
    setTarget, 
    updateCurrent,
    displayMode,
    setDisplayMode,
    convertToDisplayValue,
    convertFromDisplayValue,
    getDisplayUnit,
    getTarget, // Added getTarget
    getProgress // Added getProgress
  } = useDailyTickTargetStore()

  // Use selectedDate for fetching progress
  const todayTarget = getTarget(selectedDate)
  const progress = getProgress(selectedDate) || { current: 0, target: 0, percentage: 0, positive: 0, negative: 0, total: 0 }

  // Calculate current day's ticks from trades
  useEffect(() => {
    // Determine display date/range based on date filter or today
    let fromDate: string
    let toDate: string
    
    if (dateRange && dateRange.from) {
      // If there's a date filter, use the date range
      // Use local date formatting to avoid timezone issues
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      fromDate = formatLocalDate(dateRange.from)
      toDate = dateRange.to ? formatLocalDate(dateRange.to) : fromDate
    } else {
      // No date filter, use today's date
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`
      fromDate = todayStr
      toDate = todayStr
    }
    
    // Use the from date as the selected date for storage
    setSelectedDate(fromDate)

    // Filter trades for the selected period (even if trades array is empty)
    const displayTrades = trades.filter(trade => {
      // Validate that entryDate exists and is valid
      if (!trade.entryDate) return false
      
      const entryDate = new Date(trade.entryDate)
      if (isNaN(entryDate.getTime())) return false
      
      const tradeDate = entryDate.toISOString().split('T')[0]
      // Check if trade date is within the range
      return tradeDate >= fromDate && tradeDate <= toDate
    })

    // Calculate ticks breakdown for the period (even if no trades)
    let totalTicks = 0
    let positiveTicks = 0
    let negativeTicks = 0
    let totalAbsoluteTicks = 0
    
    if (displayTrades.length > 0) {
      displayTrades.forEach(trade => {
        // Validate required fields
        if (!trade.pnl || !trade.quantity || !trade.instrument) return
        
        // Fix ticker matching logic - sort by length descending to match longer tickers first
        const matchingTicker = Object.keys(tickDetails)
          .sort((a, b) => b.length - a.length)
          .find(ticker => trade.instrument.includes(ticker))
        
        // Use tickValue (monetary value per tick) instead of tickSize (minimum price increment)
        const tickValue = matchingTicker ? tickDetails[matchingTicker].tickValue : 1
        
        // Calculate PnL per contract first
        const pnlPerContract = Number(trade.pnl) / Number(trade.quantity)
        if (isNaN(pnlPerContract)) return
        
        const ticks = Math.round(pnlPerContract / tickValue)
        if (!isNaN(ticks)) {
          totalTicks += ticks
          totalAbsoluteTicks += Math.abs(ticks)
          
          if (ticks > 0) {
            positiveTicks += ticks
          } else {
            negativeTicks += ticks
          }
        }
      })
    }

    // Always update current ticks for the period with breakdown (even if zero)
    updateCurrent(fromDate, totalTicks, positiveTicks, negativeTicks, totalAbsoluteTicks)
  }, [trades, tickDetails, updateCurrent, dateRange])

  const handleSaveTarget = () => {
    const targetDate = selectedDate
    const displayValue = parseInt(targetValue) || 0
    const tickValue = convertFromDisplayValue(displayValue)
    setTarget(targetDate, tickValue)
    setTargetValue('')
    setIsDialogOpen(false)
  }

  const handleQuickIncrement = (increment: number) => {
    const targetDate = selectedDate
    const currentTarget = todayTarget?.target || 0
    const displayIncrement = convertFromDisplayValue(increment)
    const newTarget = Math.max(0, currentTarget + displayIncrement)
    setTarget(targetDate, newTarget)
  }

  const isTargetSet = todayTarget && todayTarget.target > 0
  const isOverTarget = progress.current > progress.target && progress.target > 0

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small' ? "p-2 h-10" : "p-3 sm:p-4 h-14"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small' ? "text-sm" : "text-base"
              )}
            >
              {t('widgets.dailyTickTarget.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('widgets.dailyTickTarget.tooltip')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            {/* Points/Ticks Toggle */}
            <div className="flex items-center gap-2 ml-2">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs",
                        displayMode === 'ticks' ? "font-medium" : "text-muted-foreground"
                      )}>
                        {t('widgets.dailyTickTarget.displayMode.ticks')}
                      </span>
                      <Switch
                        checked={displayMode === 'points'}
                        onCheckedChange={(checked) => setDisplayMode(checked ? 'points' : 'ticks')}
                        className="h-4 w-8"
                      />
                      <span className={cn(
                        "text-xs",
                        displayMode === 'points' ? "font-medium" : "text-muted-foreground"
                      )}>
                        {t('widgets.dailyTickTarget.displayMode.points')}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{t('widgets.dailyTickTarget.displayMode.tooltip')}</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Target controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickIncrement(-1)}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickIncrement(1)}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
            </Button>
            
            {/* Target setting dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <Target className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('widgets.dailyTickTarget.setTarget')}</DialogTitle>
                  <DialogDescription>
                    {t('widgets.dailyTickTarget.setTargetDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      {t('widgets.dailyTickTarget.target')} ({displayMode === 'points' ? t('widgets.dailyTickTarget.displayMode.points') : t('widgets.dailyTickTarget.displayMode.ticks')})
                    </label>
                    <Input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder={Math.round(convertToDisplayValue(progress.target)).toString()}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSaveTarget}>
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-full flex flex-col justify-center gap-4">
          {/* Current vs Target Display */}
          <div className="flex items-center justify-center gap-4 border-b pb-2">
            <div className="flex flex-col items-center gap-1">
              <span className={cn(
                "text-muted-foreground uppercase tracking-wide",
                size === 'small' ? "text-xs" : "text-sm"
              )}>
                {t('widgets.dailyTickTarget.current')}
              </span>
              <span className={cn(
                "font-bold",
                isOverTarget ? "text-green-500" : "text-foreground",
                size === 'small' ? "text-xl" : "text-3xl"
              )}>
                {Math.round(convertToDisplayValue(progress.current))}
                <span className="text-sm font-normal ml-1 text-muted-foreground">
                  {getDisplayUnit()}{progress.current !== 1 ? 's' : ''}
                </span>
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-lg">/</span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <span className={cn(
                "text-muted-foreground uppercase tracking-wide",
                size === 'small' ? "text-xs" : "text-sm"
              )}>
                {t('widgets.dailyTickTarget.target')}
              </span>
              <span className={cn(
                "font-bold",
                size === 'small' ? "text-xl" : "text-3xl"
              )}>
                {Math.round(convertToDisplayValue(progress.target))}
                <span className="text-sm font-normal ml-1 text-muted-foreground">
                  {getDisplayUnit()}{progress.target !== 1 ? 's' : ''}
                </span>
              </span>
            </div>
          </div>
          
          {/* Breakdown Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
              <ArrowUp className="h-4 w-4 text-green-500" />
              <div className="flex flex-col gap-0.5">
                <span className={cn(
                  "text-xs text-muted-foreground",
                  size === 'small' ? "text-2xs" : "text-xs"
                )}>
                  {t('widgets.dailyTickTarget.positive')}
                </span>
                <span className={cn(
                  "font-semibold text-green-500",
                  size === 'small' ? "text-sm" : "text-base"
                )}>
                  {Math.round(convertToDisplayValue(progress.positive))}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
              <ArrowDown className="h-4 w-4 text-red-500" />
              <div className="flex flex-col gap-0.5">
                <span className={cn(
                  "text-xs text-muted-foreground",
                  size === 'small' ? "text-2xs" : "text-xs"
                )}>
                  {t('widgets.dailyTickTarget.negative')}
                </span>
                <span className={cn(
                  "font-semibold text-red-500",
                  size === 'small' ? "text-sm" : "text-base"
                )}>
                  {Math.round(convertToDisplayValue(progress.negative))}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isTargetSet && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-muted-foreground",
                  size === 'small' ? "text-2xs" : "text-xs"
                )}>
                  {t('widgets.dailyTickTarget.progress')}
                </span>
                <span className={cn(
                  "font-medium",
                  isOverTarget ? "text-green-500" : "text-foreground",
                  size === 'small' ? "text-2xs" : "text-xs"
                )}>
                  {Math.round(progress.percentage)}%
                </span>
              </div>
              <Progress 
                value={progress.percentage} 
                className={cn(
                  "h-2",
                  isOverTarget ? "bg-green-100 dark:bg-green-900/20" : ""
                )}
              />
            </div>
          )}

          {/* No target set message */}
          {!isTargetSet && (
            <div className="flex flex-col items-center gap-2 text-center py-2">
              <Target className="h-6 w-6 text-muted-foreground/50" />
              <span className={cn(
                "text-muted-foreground",
                size === 'small' ? "text-xs" : "text-sm"
              )}>
                {t('widgets.dailyTickTarget.noTargetSet')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 