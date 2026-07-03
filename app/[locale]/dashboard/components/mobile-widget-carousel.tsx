"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useCarouselGestureLock } from "@/hooks/use-carousel-gesture-lock"
import { useI18n } from "@/locales/client"
import { getWidgetDisplayName } from "../lib/widget-display-name"
import { Widget } from "../types/dashboard"

const MOBILE_CAROUSEL_HEIGHT =
  "calc(100dvh - var(--navbar-height, 5rem) - var(--tabs-height, 3rem) - var(--mobile-toolbar-top, 5.5rem))"

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
  const t = useI18n()
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
      <div className="flex h-full w-full">
        <div
          ref={scrollerRef}
          className="h-full min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sortedWidgets.map((widget, index) => (
            <div
              key={widget.i}
              id={`mobile-widget-slide-${widget.i}`}
              ref={(el) => {
                slideRefs.current[index] = el
              }}
              className="w-full shrink-0 snap-start snap-always"
              style={{ height: MOBILE_CAROUSEL_HEIGHT, scrollSnapStop: "always" }}
              role="tabpanel"
              aria-label={getWidgetDisplayName(t, widget.type)}
              aria-hidden={index !== currentIndex}
            >
              <div className="h-full w-full min-h-0 px-2 pb-2">
                {renderWidget(widget)}
              </div>
            </div>
          ))}
        </div>

        {sortedWidgets.length > 1 && (
          <div
            className="flex h-full w-11 shrink-0 flex-col items-center gap-0 py-4 pr-1"
            role="tablist"
            aria-orientation="vertical"
            aria-label={t("widgets.mobile.carouselNavigation")}
          >
            {sortedWidgets.map((widget, index) => {
              const widgetName = getWidgetDisplayName(t, widget.type)

              return (
                <button
                  key={widget.i}
                  type="button"
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-controls={`mobile-widget-slide-${widget.i}`}
                  aria-label={t("widgets.mobile.carouselGoTo", {
                    index: index + 1,
                    total: sortedWidgets.length,
                    widgetName,
                  })}
                  className="flex min-h-11 min-w-11 flex-1 items-center justify-center"
                  onClick={() => scrollToIndex(index)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "block min-h-2 flex-1 rounded-full transition-all",
                      index === currentIndex
                        ? "w-[3px] bg-primary"
                        : "w-0.5 bg-muted-foreground/35"
                    )}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
