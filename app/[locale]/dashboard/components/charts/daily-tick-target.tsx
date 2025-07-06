"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, HelpCircle, Plus, Minus } from "lucide-react"
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
  const { formattedTrades: trades } = useData()
  const t = useI18n()
  const tickDetails = useTickDetailsStore(state => state.tickDetails)
  const [targetValue, setTargetValue] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const { 
    getTodayTarget, 
    getTodayProgress, 
    setTarget, 
    updateCurrent 
  } = useDailyTickTargetStore()

  const todayTarget = getTodayTarget()
  const progress = getTodayProgress()

  // Calculate current day's ticks from trades
  useEffect(() => {
    if (!trades.length) return

    const today = new Date().toISOString().split('T')[0]
    const todayTrades = trades.filter(trade => {
      // Validate that entryDate exists and is valid
      if (!trade.entryDate) return false
      
      const entryDate = new Date(trade.entryDate)
      if (isNaN(entryDate.getTime())) return false
      
      const tradeDate = entryDate.toISOString().split('T')[0]
      return tradeDate === today
    })

    if (todayTrades.length === 0) return

    // Calculate total ticks for today
    let totalTicks = 0
    todayTrades.forEach(trade => {
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
      }
    })

    // Update current ticks for today
    updateCurrent(today, totalTicks)
  }, [trades, tickDetails, updateCurrent])

  const handleSaveTarget = () => {
    const today = new Date().toISOString().split('T')[0]
    const newTarget = parseInt(targetValue) || 0
    setTarget(today, newTarget)
    setTargetValue('')
    setIsDialogOpen(false)
  }

  const handleQuickIncrement = (increment: number) => {
    const today = new Date().toISOString().split('T')[0]
    const currentTarget = todayTarget?.target || 0
    const newTarget = Math.max(0, currentTarget + increment)
    setTarget(today, newTarget)
  }

  const isTargetSet = todayTarget && todayTarget.target > 0
  const isOverTarget = progress.current > progress.target && progress.target > 0

  return (
    <Card className="h-full flex flex-col">
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
              {t('widgets.dailyTickTarget.title')}
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
                  <p>{t('widgets.dailyTickTarget.tooltip')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
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
                      {t('widgets.dailyTickTarget.target')}
                    </label>
                    <Input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder={progress.target.toString()}
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
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-full flex flex-col justify-center gap-4">
          {/* Current vs Target Display */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className={cn(
                "text-muted-foreground",
                size === 'small-long' ? "text-xs" : "text-sm"
              )}>
                {t('widgets.dailyTickTarget.current')}
              </span>
              <span className={cn(
                "font-bold",
                isOverTarget ? "text-green-500" : "text-foreground",
                size === 'small-long' ? "text-lg" : "text-2xl"
              )}>
                {progress.current}
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-xs">/</span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <span className={cn(
                "text-muted-foreground",
                size === 'small-long' ? "text-xs" : "text-sm"
              )}>
                {t('widgets.dailyTickTarget.target')}
              </span>
              <span className={cn(
                "font-bold",
                size === 'small-long' ? "text-lg" : "text-2xl"
              )}>
                {progress.target}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {isTargetSet && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-muted-foreground",
                  size === 'small-long' ? "text-xs" : "text-sm"
                )}>
                  {t('widgets.dailyTickTarget.progress')}
                </span>
                <span className={cn(
                  "font-medium",
                  isOverTarget ? "text-green-500" : "text-foreground",
                  size === 'small-long' ? "text-xs" : "text-sm"
                )}>
                  {Math.round(progress.percentage)}%
                </span>
              </div>
              <Progress 
                value={progress.percentage} 
                className={cn(
                  "h-3",
                  isOverTarget ? "bg-green-100 dark:bg-green-900/20" : ""
                )}
              />
            </div>
          )}

          {/* No target set message */}
          {!isTargetSet && (
            <div className="flex flex-col items-center gap-2 text-center">
              <Target className="h-8 w-8 text-muted-foreground/50" />
              <span className={cn(
                "text-muted-foreground",
                size === 'small-long' ? "text-xs" : "text-sm"
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