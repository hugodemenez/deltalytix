"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNewsFilterStore } from "@/store/news-filter"

interface ImportanceFilterProps {
  onChange?: (value: number) => void
  initialValue?: number
  className?: string
}

export function ImportanceFilter({ onChange, initialValue = 0, className }: ImportanceFilterProps) {
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

    if (index + 1 <= value) {
      switch (value) {
        case 1:
          return "text-blue-500"
        case 2:
          return "text-yellow-500"
        case 3:
          return "text-red-500"
        default:
          return "text-gray-300"
      }
    }

    return "text-gray-300"
  }

  return (
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
        <button
          key={index}
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
              "h-6 w-6 transition-colors duration-300",
              getStarColor(index),
              importance === index + 1
                ? "fill-current"
                : hoverValue === index + 1
                  ? "fill-current opacity-70"
                  : "fill-transparent",
            )}
          />
        </button>
      ))}
      <span className="sr-only">
        {importance === 0
          ? "No importance level selected"
          : `Importance level: ${importance} star${importance !== 1 ? "s" : ""}`}
      </span>
    </div>
  )
}
