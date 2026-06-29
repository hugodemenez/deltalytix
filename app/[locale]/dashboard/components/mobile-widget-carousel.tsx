"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useCarouselGestureLock } from "@/hooks/use-carousel-gesture-lock"
import { Widget } from "../types/dashboard"

const MOBILE_CAROUSEL_HEIGHT =
  "calc(100dvh - var(--navbar-height, 5rem) - var(--tabs-height, 3rem))"

interface MobileWidgetCarouselProps {
  widgets: Widget[]
  renderWidget: (widget: Widget) => React.ReactNode
  className?: string
  onActiveWidgetChange?: (widget: Widget | null) => void
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
  onActiveWidgetChange,
}: MobileWidgetCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const sortedWidgets = useMemo(
    () => sortWidgetsForCarousel(widgets),
    [widgets]
  )

  const activeWidget = sortedWidgets[currentIndex] ?? null

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, sortedWidgets.length)
    if (currentIndex >= sortedWidgets.length) {
      setCurrentIndex(Math.max(0, sortedWidgets.length - 1))
    }
  }, [sortedWidgets.length, currentIndex])

  useEffect(() => {
    onActiveWidgetChange?.(activeWidget)
  }, [activeWidget, onActiveWidgetChange])

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

  useCarouselGestureLock(scrollerRef)

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
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
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
            <div className="h-full w-full min-h-0 pl-1 pr-3 pb-24">
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </div>

      {sortedWidgets.length > 1 && (
        <div
          className="pointer-events-none absolute inset-y-0 right-1 z-20 flex w-2 flex-col justify-center gap-1 py-4"
          aria-hidden
        >
          {sortedWidgets.map((widget, index) => (
            <button
              key={widget.i}
              type="button"
              aria-label={`Widget ${index + 1}`}
              className={cn(
                "pointer-events-auto min-h-0 flex-1 rounded-full transition-all",
                index === currentIndex
                  ? "w-[3px] bg-primary"
                  : "w-0.5 bg-muted-foreground/35"
              )}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
