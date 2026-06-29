"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [api, setApi] = useState<CarouselApi>()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideHeight, setSlideHeight] = useState(0)

  const sortedWidgets = useMemo(
    () => sortWidgetsForCarousel(widgets),
    [widgets]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateHeight = () => {
      setSlideHeight(container.clientHeight)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container)
    window.addEventListener("resize", updateHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateHeight)
    }
  }, [])

  const onSelect = useCallback(() => {
    if (!api) return
    setCurrentIndex(api.selectedScrollSnap())
  }, [api])

  useEffect(() => {
    if (!api) return

    onSelect()
    api.on("select", onSelect)
    api.on("reInit", onSelect)

    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api, onSelect])

  useEffect(() => {
    if (!api || slideHeight === 0) return
    api.reInit()
  }, [api, slideHeight, sortedWidgets.length])

  if (sortedWidgets.length === 0) {
    return null
  }

  const slideStyle =
    slideHeight > 0
      ? { flex: `0 0 ${slideHeight}px`, height: slideHeight, minHeight: slideHeight }
      : undefined

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden touch-pan-y",
        className
      )}
      style={{ height: MOBILE_CAROUSEL_HEIGHT }}
    >
      {slideHeight > 0 && (
        <Carousel
          orientation="vertical"
          opts={{
            loop: false,
            align: "start",
            axis: "y",
            watchDrag: () => window.innerWidth < 768,
          }}
          setApi={setApi}
          className="h-full w-full [&>div]:h-full [&>div]:touch-pan-y"
        >
          <CarouselContent className="-mt-0 flex-col">
            {sortedWidgets.map((widget) => (
              <CarouselItem
                key={widget.i}
                className="min-h-0 shrink-0 grow-0 basis-auto pt-0"
                style={slideStyle}
              >
                <div className="h-full w-full min-h-0 px-2 pb-24">
                  {renderWidget(widget)}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}

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
                onClick={() => api?.scrollTo(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
