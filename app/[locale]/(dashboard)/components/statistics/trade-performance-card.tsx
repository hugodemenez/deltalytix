'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function TradePerformanceCard({ nbWin, nbLoss, nbBe, nbTrades }: { nbWin: number, nbLoss: number, nbBe: number, nbTrades: number }) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const lastTouchTime = useRef(0)

  const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
  const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
  const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

  const positiveColor = "hsl(var(--chart-2))" // Green color
  const negativeColor = "hsl(var(--chart-1))" // Red color
  const neutralColor = "hsl(var(--muted))" // Neutral color for breakeven

  const data = [
    { name: 'Win', value: winRate, color: positiveColor },
    { name: 'BE', value: beRate, color: neutralColor },
    { name: 'Loss', value: lossRate, color: negativeColor },
  ]

  const handleTooltipToggle = useCallback((name: string) => {
    setActiveTooltip(prev => prev === name ? null : name)
  }, [])

  const debouncedTooltipToggle = useMemo(
    () => debounce((name: string) => {
      handleTooltipToggle(name)
    }, 300),
    [handleTooltipToggle]
  )

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setActiveTooltip(null)
      }
    }

    const handleTouchStart = () => {
      setIsTouch(true)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    window.addEventListener('touchstart', handleTouchStart, { once: true })

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  const handleTouchStart = useCallback((name: string, e: React.TouchEvent) => {
    e.preventDefault()
    const now = Date.now()
    if (now - lastTouchTime.current > 300) {
      debouncedTooltipToggle(name)
      lastTouchTime.current = now
    }
  }, [debouncedTooltipToggle])

  return (
    <Card className="col-span-1" ref={cardRef}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Trade Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={0}>
          <div className="relative h-8">
            {data.map((entry, index) => {
              const prevTotal = data.slice(0, index).reduce((sum, d) => sum + d.value, 0)
              return (
                <Tooltip key={entry.name} open={activeTooltip === entry.name}>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute top-0 h-8 cursor-pointer transition-opacity ${index === 0 ? 'rounded-l-sm' : ''} ${index === data.length - 1 ? 'rounded-r-sm' : ''}`}
                      style={{
                        left: `${prevTotal}%`,
                        width: `${entry.value}%`,
                        backgroundColor: entry.color,
                      }}
                      onClick={() => !isTouch && handleTooltipToggle(entry.name)}
                      onMouseEnter={() => !isTouch && setActiveTooltip(entry.name)}
                      onMouseLeave={() => !isTouch && setActiveTooltip(null)}
                      onTouchStart={(e) => handleTouchStart(entry.name, e)}
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
        <div className="mt-4 text-sm">
          <span>Win Rate: <span className="text-green-500">{winRate}%</span></span>
        </div>
      </CardContent>
    </Card>
  )
}