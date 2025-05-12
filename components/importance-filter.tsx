"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNewsFilterStore } from "@/store/news-filter"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/locales/client"

interface ImportanceFilterProps {
  onChange?: (value: number) => void
  initialValue?: number
  className?: string
}

export function ImportanceFilter({ onChange, initialValue = 0, className }: ImportanceFilterProps) {
  const t = useI18n()
  const importance = useNewsFilterStore((s) => s.importance)
  const setImportance = useNewsFilterStore((s) => s.setImportance)
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const handleMouseEnter = (value: number) => {
    setHoverValue(value)
  }

  const handleMouseLeave = () => {
    setHoverValue(null)
  }

  const handleClick = (value: number) => {
    // Toggle off if clicking the same value
    const newValue = importance === value ? 0 : value
    setImportance(newValue)
    onChange?.(newValue)
  }

  const getStarColor = (index: number) => {
    const value = hoverValue !== null ? hoverValue : importance
    return index + 1 <= value ? "text-yellow-500" : "text-gray-300"
  }

  const getTooltipLabel = (value: number) => {
    switch (value) {
      case 1:
        return t('calendar.importanceFilter.low')
      case 2:
        return t('calendar.importanceFilter.medium')
      case 3:
        return t('calendar.importanceFilter.high')
      default:
        return ""
    }
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "inline-flex items-center gap-1 p-2 rounded-md transition-all duration-300",
          className,
        )}
        onMouseLeave={handleMouseLeave}
        role="radiogroup"
        aria-label="Importance level"
      >
        {[0, 1, 2].map((index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "relative p-1 rounded-full transition-transform duration-200",
                  hoverValue === index + 1 || importance === index + 1 ? "scale-110" : "",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                )}
                onMouseEnter={() => handleMouseEnter(index + 1)}
                onClick={() => handleClick(index + 1)}
                role="radio"
                aria-checked={importance === index + 1}
                aria-label={`${index + 1} star${index !== 0 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-colors duration-300",
                    getStarColor(index),
                    importance >= index + 1
                      ? "fill-current"
                      : hoverValue === index + 1
                        ? "fill-current opacity-70"
                        : "fill-transparent",
                  )}
                  strokeWidth={1.5}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getTooltipLabel(index + 1)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <span className="sr-only">
          {importance === 0
            ? "No importance level selected"
            : `Importance level: ${importance} star${importance !== 1 ? "s" : ""}`}
        </span>
      </div>
    </TooltipProvider>
  )
}
