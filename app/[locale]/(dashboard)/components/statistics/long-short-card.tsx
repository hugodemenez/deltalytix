'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useCalendarData } from '@/components/context/trades-data'

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function LongShortPerformanceCard() {
  const { calendarData } = useCalendarData()
  const chartData = Object.entries(calendarData).map(([date, values]) => ({
    date,
    pnl: values.pnl,
    shortNumber: values.shortNumber,
    longNumber: values.longNumber,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const longNumber = chartData.reduce((acc, curr) => acc + curr.longNumber, 0)
  const shortNumber = chartData.reduce((acc, curr) => acc + curr.shortNumber, 0)

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const lastTouchTime = useRef(0)

  const totalTrades = longNumber + shortNumber
  const longRate = Number((longNumber / totalTrades * 100).toFixed(2))
  const shortRate = Number((shortNumber / totalTrades * 100).toFixed(2))

  const longColor = "hsl(var(--chart-2))" 
  const shortColor = "hsl(var(--chart-1))" 

  const data = [
    { name: 'Long', value: longRate, color: longColor, number: longNumber },
    { name: 'Short', value: shortRate, color: shortColor, number: shortNumber },
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
        <CardTitle className="text-sm font-medium">Long/Short</CardTitle>
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
                    <p>{entry.name}: {entry.value.toFixed(2)}% ({entry.number} trades)</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
        <div className="mt-4 flex flex-col justify-between text-sm">
          <span>Total Trades: {totalTrades}</span>
        </div>
      </CardContent>
    </Card>
  )
}