"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { Widget } from "../types/dashboard"

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
  const [api, setApi] = useState<CarouselApi>()
  const [currentIndex, setCurrentIndex] = useState(0)

  const sortedWidgets = useMemo(
    () => sortWidgetsForCarousel(widgets),
    [widgets]
  )

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
    if (!api) return
    api.reInit()
  }, [api, sortedWidgets.length])

  if (sortedWidgets.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "relative h-[calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem))] w-full",
        className
      )}
    >
      <Carousel
        orientation="vertical"
        opts={{
          loop: false,
          align: "start",
          watchDrag: () => window.innerWidth < 768,
        }}
        setApi={setApi}
        className="h-full w-full"
      >
        <CarouselContent className="h-full flex-col -mt-0 [&>div]:h-full">
          {sortedWidgets.map((widget) => (
            <CarouselItem
              key={widget.i}
              className="h-full basis-full pt-0"
            >
              <div className="h-full w-full px-1 pb-20">
                {renderWidget(widget)}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

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
