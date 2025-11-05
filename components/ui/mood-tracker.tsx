"use client"

import React from "react"
import * as HoverCardPrimitives from "@radix-ui/react-hover-card"
import { cn } from "@/lib/utils"

interface TrackerBlockProps {
  key?: string | number
  color?: string
  hoverEffect?: boolean
  defaultBackgroundColor?: string
}

interface BlockInternalProps extends TrackerBlockProps {
  index: number
  selectedIndex: number | null
  hoveredIndex: number | null
  onHover: (index: number | null) => void
  onClick: (index: number) => void
  blockColor: string
  isHighlighted: boolean
  animationDelay: number
}

const Block = ({
  color,
  defaultBackgroundColor,
  hoverEffect,
  index,
  selectedIndex,
  hoveredIndex,
  onHover,
  onClick,
  blockColor,
  isHighlighted,
  animationDelay,
}: BlockInternalProps) => {
  const [open, setOpen] = React.useState(false)

  const shouldAnimate = selectedIndex !== null && index <= selectedIndex

  return (
    <HoverCardPrimitives.Root open={open} onOpenChange={setOpen} openDelay={0} closeDelay={0}>
      <HoverCardPrimitives.Trigger onClick={() => setOpen(true)} asChild>
        <div
          className="size-full overflow-hidden px-[0.5px] transition first:rounded-l-[4px] first:pl-0 last:rounded-r-[4px] last:pr-0 sm:px-px cursor-pointer"
          onMouseEnter={() => onHover(index)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onClick(index)}
        >
          <div
            className={cn(
              "size-full rounded-[1px] transition-all duration-300",
              blockColor,
              hoverEffect ? "hover:opacity-80" : "",
              shouldAnimate && "animate-pulse",
            )}
            style={{
              animationDelay: shouldAnimate ? `${animationDelay}ms` : undefined,
              animationDuration: shouldAnimate ? "600ms" : undefined,
              animationIterationCount: shouldAnimate ? "1" : undefined,
            }}
          />
        </div>
      </HoverCardPrimitives.Trigger>
    </HoverCardPrimitives.Root>
  )
}

Block.displayName = "Block"

interface TrackerProps extends React.HTMLAttributes<HTMLDivElement> {
  data: TrackerBlockProps[]
  defaultBackgroundColor?: string
  hoverEffect?: boolean
  onSelectionChange?: (index: number) => void
  // Optional externally-controlled selected index for initial/controlled state
  valueIndex?: number | null
}

// Pre-computed color arrays for performance
const COLOR_MAPS = {
  red: ["bg-red-100", "bg-red-200", "bg-red-300", "bg-red-400", "bg-red-500", "bg-red-600", "bg-red-700"],
  orange: [
    "bg-orange-100",
    "bg-orange-200",
    "bg-orange-300",
    "bg-orange-400",
    "bg-orange-500",
    "bg-orange-600",
    "bg-orange-700",
  ],
  yellow: [
    "bg-yellow-100",
    "bg-yellow-200",
    "bg-yellow-300",
    "bg-yellow-400",
    "bg-yellow-500",
    "bg-yellow-600",
    "bg-yellow-700",
  ],
  lime: ["bg-lime-100", "bg-lime-200", "bg-lime-300", "bg-lime-400", "bg-lime-500", "bg-lime-600", "bg-lime-700"],
  green: [
    "bg-green-100",
    "bg-green-200",
    "bg-green-300",
    "bg-green-400",
    "bg-green-500",
    "bg-green-600",
    "bg-green-700",
  ],
} as const

const Tracker = React.forwardRef<HTMLDivElement, TrackerProps>(
  (
    { data = [], defaultBackgroundColor = "bg-gray-300", className, hoverEffect, onSelectionChange, valueIndex, ...props },
    forwardedRef,
  ) => {
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
    const [animationKey, setAnimationKey] = React.useState(0)

    // Sync internal selection with external valueIndex when provided
    React.useEffect(() => {
      if (typeof valueIndex === 'number') {
        setSelectedIndex(valueIndex)
      } else if (valueIndex === null) {
        setSelectedIndex(null)
      }
    }, [valueIndex])

    // Fast color computation using pre-computed maps
    const getColorForIndex = React.useCallback((index: number, totalBlocks: number) => {
      const ratio = index / (totalBlocks - 1)

      if (ratio <= 0.2) return "red"
      if (ratio <= 0.4) return "orange"
      if (ratio <= 0.6) return "yellow"
      if (ratio <= 0.8) return "lime"
      return "green"
    }, [])

    const getBlockColor = React.useCallback(
      (blockIndex: number, activeIndex: number | null, totalBlocks: number) => {
        if (activeIndex === null) {
          return defaultBackgroundColor
        }

        if (blockIndex > activeIndex) {
          return "bg-blue-300" // Highlighted blocks
        }

        // Get base color for the active index
        const baseColor = getColorForIndex(activeIndex, totalBlocks)
        const colorMap = COLOR_MAPS[baseColor]

        // Calculate intensity based on position (0 to 6 for array index)
        const intensity = Math.floor((blockIndex / activeIndex) * 6)
        return colorMap[Math.min(intensity, 6)]
      },
      [defaultBackgroundColor, getColorForIndex],
    )

    const handleClick = (index: number) => {
      setSelectedIndex(index)
      setAnimationKey((prev) => prev + 1)
      onSelectionChange?.(index)
    }

    const handleHover = (index: number | null) => {
      setHoveredIndex(index)
    }

    const activeIndex = hoveredIndex !== null ? hoveredIndex : selectedIndex
    const totalBlocks = data.length

    return (
      <div ref={forwardedRef} className={cn("group flex h-8 w-full items-center", className)} {...props}>
        {data.map((blockProps, index) => {
          const { key: blockKey, ...restBlockProps } = blockProps
          const blockColor = getBlockColor(index, activeIndex, totalBlocks)
          const isHighlighted = activeIndex !== null && index > activeIndex
          const animationDelay = index * 20 // Faster animation

          return (
            <Block
              key={`${blockKey ?? index}-${animationKey}`}
              index={index}
              selectedIndex={selectedIndex}
              hoveredIndex={hoveredIndex}
              onHover={handleHover}
              onClick={handleClick}
              blockColor={blockColor}
              isHighlighted={isHighlighted}
              animationDelay={animationDelay}
              defaultBackgroundColor={defaultBackgroundColor}
              hoverEffect={hoverEffect}
              {...restBlockProps}
            />
          )
        })}
      </div>
    )
  },
)

Tracker.displayName = "Tracker"

export { Tracker, type TrackerBlockProps }
