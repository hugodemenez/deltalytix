"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Widget } from "../types/dashboard"

const MOBILE_CAROUSEL_HEIGHT =
  "calc(100dvh - var(--navbar-height, 5rem) - var(--tabs-height, 3rem))"

interface MobileWidgetCarouselProps {
  widgets: Widget[]
  renderWidget: (widget: Widget) => React.ReactNode
  className?: string
}

function sortWidgetsForCarousel(widgets: Widget[]): Widget[] {
  return [...widgets].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })
}

export function MobileWidgetCarousel({
  widgets,
  renderWidget,
  className,
}: MobileWidgetCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const sortedWidgets = useMemo(
    () => sortWidgetsForCarousel(widgets),
    [widgets]
  )

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, sortedWidgets.length)
  }, [sortedWidgets.length])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || sortedWidgets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = -1
        let bestRatio = 0

        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = slideRefs.current.findIndex((el) => el === entry.target)
          if (index >= 0 && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio
            bestIndex = index
          }
        }

        if (bestIndex >= 0) {
          setCurrentIndex(bestIndex)
        }
      },
      {
        root: scroller,
        threshold: [0.5, 0.75, 1],
      }
    )

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sortedWidgets])

  const scrollToIndex = useCallback((index: number) => {
    slideRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  if (sortedWidgets.length === 0) {
    return null
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ height: MOBILE_CAROUSEL_HEIGHT }}
    >
      <div
        ref={scrollerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
      >
        {sortedWidgets.map((widget, index) => (
          <div
            key={widget.i}
            ref={(el) => {
              slideRefs.current[index] = el
            }}
            className="w-full shrink-0 snap-start snap-always"
            style={{ height: MOBILE_CAROUSEL_HEIGHT, scrollSnapStop: "always" }}
          >
            <div className="h-full w-full min-h-0 px-2 pb-24">
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </div>

      {sortedWidgets.length > 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center"
          aria-hidden
        >
          <div className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            {sortedWidgets.map((widget, index) => (
              <button
                key={widget.i}
                type="button"
                aria-label={`Widget ${index + 1}`}
                className={cn(
                  "pointer-events-auto h-1.5 rounded-full transition-all",
                  index === currentIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/40"
                )}
                onClick={() => scrollToIndex(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
