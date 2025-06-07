'use client'

import { useData } from "@/context/data-provider"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WidgetSize } from '../../types/dashboard'
import { Scale, HelpCircle } from "lucide-react"
import { useI18n } from '@/locales/client'
import { useMemo } from "react"

interface RiskRewardRatioCardProps {
  size?: WidgetSize
}

export default function RiskRewardRatioCard({ size = 'tiny' }: RiskRewardRatioCardProps) {
  const { formattedTrades } = useData()
  const t = useI18n()
  
  const { avgWin, avgLoss, riskRewardRatio, profitPercentage } = useMemo(() => {
    // Filter winning and losing trades
    const winningTrades = formattedTrades.filter(trade => trade.pnl > 0)
    const losingTrades = formattedTrades.filter(trade => trade.pnl < 0)

    // Calculate averages
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length
      : 0

    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length
      : 0

    // Calculate Risk-Reward ratio
    const riskRewardRatio = Math.abs(avgLoss) > 0 
      ? Number((avgWin / Math.abs(avgLoss)).toFixed(2)) 
      : 0
    
    // Calculate progress percentage for visualization
    const totalValue = Math.abs(avgLoss) + Math.abs(avgWin)
    const profitPercentage = totalValue > 0 
      ? (Math.abs(avgWin) / totalValue) * 100 
      : 50

    return { avgWin, avgLoss, riskRewardRatio, profitPercentage }
  }, [formattedTrades])

  return (
    <Card className="h-full">
      <div className="flex flex-col items-center justify-center h-full gap-2 p-2">
        <div className="flex items-center gap-1.5">
          <Scale className="h-3 w-3 text-primary" />
          <span className="font-medium text-sm">RR {riskRewardRatio}</span>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={5} 
                className="max-w-[300px]"
              >
                {t('widgets.riskRewardRatio.tooltip')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full px-1 py-1.5 cursor-pointer">
                <Progress value={profitPercentage} className="h-1.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={5}>
              <div className="text-xs space-y-0.5">
                <div className="text-green-500">Avg. Win: ${avgWin.toFixed(2)}</div>
                <div className="text-red-500">Avg. Loss: ${avgLoss.toFixed(2)}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  )
} 