"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useCarouselGestureLock } from "@/hooks/use-carousel-gesture-lock"
import { useI18n } from "@/locales/client"
import { translateWithParams } from "@/lib/translation-utils"
import { getWidgetDisplayName } from "../lib/widget-display-name"
import { Widget } from "../types/dashboard"

export function buildMobileCarouselHeight(bottomInset = "0px") {
  return `calc(100dvh - var(--navbar-height, 5rem) - var(--tabs-height, 3rem) - ${bottomInset})`
}

interface MobileWidgetCarouselProps {
  widgets: Widget[]
  renderWidget: (widget: Widget) => React.ReactNode
  className?: string
  onActiveWidgetChange?: (widget: Widget | null) => void
  bottomInset?: string
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
  bottomInset = "0px",
}: MobileWidgetCarouselProps) {
  const t = useI18n()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const sortedWidgets = useMemo(
    () => sortWidgetsForCarousel(widgets),
    [widgets]
  )

  const visibleIndex =
    sortedWidgets.length > 0
      ? Math.min(currentIndex, sortedWidgets.length - 1)
      : 0
  const activeWidget = sortedWidgets[visibleIndex] ?? null
  const carouselHeight = useMemo(
    () => buildMobileCarouselHeight(bottomInset),
    [bottomInset]
  )

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, sortedWidgets.length)
  }, [sortedWidgets.length])

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
      style={{ height: carouselHeight }}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("widgets.carousel.label")}
    >
      <div className="flex h-full w-full">
        <div
          ref={scrollerRef}
          className="h-full min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sortedWidgets.map((widget, index) => {
            const widgetName = getWidgetDisplayName(t, widget.type)
            const slideId = `mobile-widget-carousel-slide-${widget.i}`
            const tabId = `mobile-widget-carousel-tab-${widget.i}`

            return (
              <div
                key={widget.i}
                id={slideId}
                ref={(el) => {
                  slideRefs.current[index] = el
                }}
                className="w-full shrink-0 snap-start snap-always"
                style={{ height: carouselHeight, scrollSnapStop: "always" }}
                role="group"
                aria-roledescription="slide"
                aria-describedby={tabId}
                aria-label={translateWithParams(t, "widgets.carousel.position", {
                  widget: widgetName,
                  index: index + 1,
                  total: sortedWidgets.length,
                })}
              >
                <div className="h-full w-full min-h-0 px-2 pb-2">
                  {renderWidget(widget)}
                </div>
              </div>
            )
          })}
        </div>

        {sortedWidgets.length > 1 && (
          <div
            className="flex h-full w-7 shrink-0 flex-col items-center gap-1 py-4 pr-0.5"
            role="radiogroup"
            aria-orientation="vertical"
            aria-label={t("widgets.carousel.indicators")}
          >
            {sortedWidgets.map((widget, index) => {
              const widgetName = getWidgetDisplayName(t, widget.type)
              const isActive = index === visibleIndex

              return (
                <button
                  key={widget.i}
                  id={`mobile-widget-carousel-tab-${widget.i}`}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-controls={`mobile-widget-carousel-slide-${widget.i}`}
                  aria-label={translateWithParams(t, "widgets.carousel.goTo", {
                    widget: widgetName,
                    index: index + 1,
                    total: sortedWidgets.length,
                  })}
                  className="group -mx-2 flex min-h-0 flex-1 touch-manipulation items-stretch justify-center px-2 py-0.5"
                  onClick={() => scrollToIndex(index)}
                >
                  <span
                    className={cn(
                      "block h-full rounded-full transition-all",
                      isActive
                        ? "w-[3px] bg-primary"
                        : "w-0.5 bg-muted-foreground/35 group-hover:bg-muted-foreground/60"
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
