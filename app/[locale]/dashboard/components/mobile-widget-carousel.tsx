"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useCarouselGestureLock } from "@/hooks/use-carousel-gesture-lock"
import { MOBILE_CAROUSEL_HEIGHT } from "@/lib/widget-carousel"
import { useI18n } from "@/locales/client"
import { getWidgetDisplayName } from "../lib/widget-display-name"
import { MobileWidgetMinimap } from "./mobile-widget-minimap"
import { Widget } from "../types/dashboard"

interface MobileWidgetCarouselProps {
  widgets: Widget[]
  renderWidget: (widget: Widget) => React.ReactNode
  className?: string
  onActiveWidgetChange?: (widget: Widget | null) => void
  slideHeight?: string
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
  slideHeight = MOBILE_CAROUSEL_HEIGHT,
}: MobileWidgetCarouselProps) {
  const t = useI18n()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const sortedWidgets = useMemo(
    () => sortWidgetsForCarousel(widgets),
    [widgets]
  )

  const widgetIds = useMemo(
    () => sortedWidgets.map((widget) => widget.i).join(","),
    [sortedWidgets]
  )

  const activeWidget = sortedWidgets[currentIndex] ?? null

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, sortedWidgets.length)
    setCurrentIndex((index) =>
      index >= sortedWidgets.length ? Math.max(0, sortedWidgets.length - 1) : index
    )
  }, [sortedWidgets.length, widgetIds])

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
          const index = Number((entry.target as HTMLElement).dataset.slideIndex)
          if (Number.isNaN(index) || index < 0) continue
          if (entry.intersectionRatio > bestRatio) {
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
        threshold: [0.25, 0.5, 0.75, 1],
      }
    )

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sortedWidgets, widgetIds])

  const scrollToIndex = useCallback((index: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTo({
      top: index * scroller.clientHeight,
      behavior: "smooth",
    })
  }, [])

  useCarouselGestureLock(scrollerRef)

  if (sortedWidgets.length === 0) {
    return null
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ height: slideHeight }}
    >
      <div
        ref={scrollerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("widgets.mobile.carouselNavigation")}
      >
        {sortedWidgets.map((widget, index) => (
          <div
            key={widget.i}
            id={`mobile-widget-slide-${widget.i}`}
            data-slide-index={index}
            ref={(el) => {
              slideRefs.current[index] = el
            }}
            className="w-full shrink-0 snap-start snap-always"
            style={{ height: slideHeight, scrollSnapStop: "always" }}
              aria-label={getWidgetDisplayName(t, widget.type)}
            aria-hidden={index !== currentIndex}
          >
            <div className="h-full w-full min-h-0 px-2 pb-2">
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </div>

      <MobileWidgetMinimap
        widgets={sortedWidgets}
        currentIndex={currentIndex}
        renderWidget={renderWidget}
        onSelectIndex={scrollToIndex}
        slideHeight={slideHeight}
      />
    </div>
  )
}
