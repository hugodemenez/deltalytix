'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function TradePerformanceCard({ nbWin, nbLoss, nbBe, nbTrades }: { nbWin: number, nbLoss: number, nbBe: number, nbTrades: number }) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
  const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
  const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

  const positiveColor = "hsl(var(--chart-2))" // Green color
  const negativeColor = "hsl(var(--chart-1))" // Red color
  const neutralColor = "hsl(var(--muted-foreground))" // Neutral color for breakeven

  const data = [
    { name: 'Win', value: winRate, color: positiveColor },
    { name: 'BE', value: beRate, color: neutralColor },
    { name: 'Loss', value: lossRate, color: negativeColor },
  ]

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Trade Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={0}>
          <div className="relative h-8">
            <Progress value={100} className="h-8 rounded-md" />
            {data.map((entry, index) => {
              const prevTotal = data.slice(0, index).reduce((sum, d) => sum + d.value, 0)
              return (
                <Tooltip key={entry.name} open={activeTooltip === entry.name}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 h-8 cursor-pointer transition-opacity"
                      style={{
                        left: `${prevTotal}%`,
                        width: `${entry.value}%`,
                        backgroundColor: entry.color,
                        borderTopLeftRadius: index === 0 ? '0.375rem' : '0',
                        borderBottomLeftRadius: index === 0 ? '0.375rem' : '0',
                        borderTopRightRadius: index === data.length - 1 ? '0.375rem' : '0',
                        borderBottomRightRadius: index === data.length - 1 ? '0.375rem' : '0',
                      }}
                      onClick={() => setActiveTooltip(activeTooltip === entry.name ? null : entry.name)}
                      onMouseEnter={() => setActiveTooltip(entry.name)}
                      onMouseLeave={() => setActiveTooltip(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{entry.name}: {entry.value.toFixed(2)}%</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}