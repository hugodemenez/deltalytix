"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface TrackerBlockProps {
  key?: string | number
  /** Optional explicit fill for a single block. Rarely needed. */
  color?: string
  hoverEffect?: boolean
  defaultBackgroundColor?: string
}

interface TrackerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  data: TrackerBlockProps[]
  defaultBackgroundColor?: string
  hoverEffect?: boolean
  onSelectionChange?: (index: number) => void
  /** Externally controlled selected index. */
  valueIndex?: number | null
}

/**
 * A discrete scale: the reader picks one step out of `data.length`.
 *
 * Position on the scale is the encoding, so the fill is monochrome — the value
 * is read from how far the fill extends, not from a hue. Callers are expected
 * to name the scale ends and state the current step in words, so the meaning
 * never rests on the bar alone.
 *
 * Exposed as a single `role="slider"` rather than N click targets, so the whole
 * scale is one stop in the tab order and is operable with the arrow keys,
 * Home/End, and PageUp/PageDown.
 */
const Tracker = React.forwardRef<HTMLDivElement, TrackerProps>(
  (
    {
      data = [],
      defaultBackgroundColor = "bg-muted",
      className,
      hoverEffect,
      onSelectionChange,
      valueIndex,
      "aria-label": ariaLabel,
      ...props
    },
    forwardedRef,
  ) => {
    const [internalIndex, setInternalIndex] = React.useState<number | null>(null)
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

    const lastIndex = Math.max(0, data.length - 1)

    // The external value wins whenever it is supplied, so the component stays
    // controlled without an effect mirroring props into state.
    const selectedIndex =
      valueIndex === undefined ? internalIndex : valueIndex

    const select = React.useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(lastIndex, index))
        setInternalIndex(clamped)
        onSelectionChange?.(clamped)
      },
      [lastIndex, onSelectionChange],
    )

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const current = selectedIndex ?? 0
      const step = Math.max(1, Math.round(data.length / 10))

      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          event.preventDefault()
          select(current + 1)
          break
        case "ArrowLeft":
        case "ArrowDown":
          event.preventDefault()
          select(current - 1)
          break
        case "PageUp":
          event.preventDefault()
          select(current + step)
          break
        case "PageDown":
          event.preventDefault()
          select(current - step)
          break
        case "Home":
          event.preventDefault()
          select(0)
          break
        case "End":
          event.preventDefault()
          select(lastIndex)
          break
      }
    }

    // Hover previews the step the pointer is over; it never commits a value.
    const activeIndex = hoveredIndex ?? selectedIndex

    return (
      <div
        ref={forwardedRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={selectedIndex ?? undefined}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHoveredIndex(null)}
        className={cn(
          "group flex h-8 w-full items-center rounded-sm outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          className,
        )}
        {...props}
      >
        {data.map((blockProps, index) => {
          const { key: blockKey, color } = blockProps
          const isFilled = activeIndex !== null && index <= activeIndex

          return (
            <div
              key={blockKey ?? index}
              aria-hidden
              onMouseEnter={() => setHoveredIndex(index)}
              onClick={() => select(index)}
              className="size-full cursor-pointer overflow-hidden px-[0.5px] first:pl-0 last:pr-0 sm:px-px"
            >
              <div
                className={cn(
                  "size-full rounded-[1px] motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
                  color ?? (isFilled ? "bg-primary" : defaultBackgroundColor),
                  hoverEffect && "group-hover:opacity-90",
                )}
              />
            </div>
          )
        })}
      </div>
    )
  },
)

Tracker.displayName = "Tracker"

export { Tracker, type TrackerBlockProps }
