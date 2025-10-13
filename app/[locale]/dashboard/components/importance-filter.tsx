"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/locales/client"

type ImpactLevel = "low" | "medium" | "high"

interface ImportanceFilterProps {
  value: ImpactLevel[]
  onValueChange: (levels: ImpactLevel[]) => void
  className?: string
}

const IMPACT_LEVELS: ImpactLevel[] = ["low", "medium", "high"]

export function ImportanceFilter({ value, onValueChange, className }: ImportanceFilterProps) {
  const t = useI18n()
  const [hoverLevel, setHoverLevel] = useState<ImpactLevel | null>(null)

  const handleClick = (level: ImpactLevel) => {
    const newLevels = value.includes(level)
      ? value.filter(l => l !== level)
      : [...value, level].sort((a, b) => 
          IMPACT_LEVELS.indexOf(a) - IMPACT_LEVELS.indexOf(b)
        )
    
    onValueChange(newLevels)
  }

  const getStarColor = (level: ImpactLevel) => {
    const isSelected = value.includes(level)
    const levelIndex = IMPACT_LEVELS.indexOf(level)
    const hoverIndex = hoverLevel ? IMPACT_LEVELS.indexOf(hoverLevel) : -1
    
    // If this level is selected, show full yellow
    if (isSelected) return "text-yellow-500"
    
    // If a higher level is selected, show lighter yellow for lower levels
    const hasHigherSelected = IMPACT_LEVELS.some((l, i) => 
      i > levelIndex && value.includes(l)
    )
    if (hasHigherSelected) return "text-yellow-300"
    
    // If hovering over a higher level, show lighter yellow for lower levels
    if (hoverLevel && levelIndex <= hoverIndex) {
      // Calculate opacity based on distance from hovered level
      const distance = hoverIndex - levelIndex
      return distance === 0 ? "text-yellow-300" : "text-yellow-200"
    }
    
    // Default gray
    return "text-gray-300"
  }

  const getStarFill = (level: ImpactLevel) => {
    const isSelected = value.includes(level)
    const levelIndex = IMPACT_LEVELS.indexOf(level)
    const hoverIndex = hoverLevel ? IMPACT_LEVELS.indexOf(hoverLevel) : -1
    
    // If this level is selected, show full fill
    if (isSelected) return "fill-current"
    
    // If a higher level is selected, show lighter fill for lower levels
    const hasHigherSelected = IMPACT_LEVELS.some((l, i) => 
      i > levelIndex && value.includes(l)
    )
    if (hasHigherSelected) return "fill-current opacity-50"
    
    // If hovering over a higher level, show lighter fill for lower levels
    if (hoverLevel && levelIndex <= hoverIndex) {
      // Calculate opacity based on distance from hovered level
      const distance = hoverIndex - levelIndex
      return distance === 0 ? "fill-current opacity-70" : "fill-current opacity-30"
    }
    
    // Default transparent
    return "fill-transparent"
  }

  const getTooltipLabel = (level: ImpactLevel) => {
    switch (level) {
      case "low":
        return t('mindset.newsImpact.importanceFilter.low')
      case "medium":
        return t('mindset.newsImpact.importanceFilter.medium')
      case "high":
        return t('mindset.newsImpact.importanceFilter.high')
    }
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "inline-flex items-center gap-1 p-2 rounded-md transition-all duration-300",
          className,
        )}
        role="group"
        aria-label="Impact level filter"
      >
        {IMPACT_LEVELS.map((level) => (
          <Tooltip key={level}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "relative p-1 rounded-full transition-all duration-200",
                  (value.includes(level) || hoverLevel === level) && "scale-110",
                  "focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  "hover:bg-yellow-50 dark:hover:bg-yellow-950/20",
                )}
                onClick={() => handleClick(level)}
                onMouseEnter={() => setHoverLevel(level)}
                onMouseLeave={() => setHoverLevel(null)}
                role="checkbox"
                aria-checked={value.includes(level)}
                aria-label={`${level} impact`}
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-colors duration-300",
                    getStarColor(level),
                    getStarFill(level),
                  )}
                  strokeWidth={1.5}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getTooltipLabel(level)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <span className="sr-only">
          {value.length === 0
            ? "No impact levels selected"
            : `Selected impact levels: ${value.join(", ")}`}
        </span>
      </div>
    </TooltipProvider>
  )
}
