"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { X, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { WIDGET_REGISTRY } from "../config/widget-registry"
import { Widget, WidgetSize, WidgetType } from "../types/dashboard"

const MOBILE_CAROUSEL_HEIGHT =
  "calc(100dvh - var(--navbar-height, 5rem) - var(--tabs-height, 3rem))"

interface MobileWidgetCarouselProps {
  widgets: Widget[]
  renderWidget: (widget: Widget) => React.ReactNode
  className?: string
  isCustomizing?: boolean
  onRemoveWidget?: (widgetId: string) => void
  onChangeWidgetSize?: (widgetId: string, size: WidgetSize) => void
}

function sortWidgetsForCarousel(widgets: Widget[]): Widget[] {
  return [...widgets].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })
}

function isValidMobileSize(widgetType: WidgetType, size: WidgetSize) {
  const config = WIDGET_REGISTRY[widgetType]
  if (!config) return true
  if (size === "small" || size === "small-long") return false
  return config.allowedSizes.includes(size)
}

export function MobileWidgetCarousel({
  widgets,
  renderWidget,
  className,
  isCustomizing = false,
  onRemoveWidget,
  onChangeWidgetSize,
}: MobileWidgetCarouselProps) {
  const t = useI18n()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSizePopoverOpen, setIsSizePopoverOpen] = useState(false)

  const sortedWidgets = useMemo(
    () => sortWidgetsForCarousel(widgets),
    [widgets]
  )

  const activeWidget = sortedWidgets[currentIndex]

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, sortedWidgets.length)
    if (currentIndex >= sortedWidgets.length) {
      setCurrentIndex(Math.max(0, sortedWidgets.length - 1))
    }
  }, [sortedWidgets.length, currentIndex])

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

  useEffect(() => {
    if (!isCustomizing) {
      setIsSizePopoverOpen(false)
    }
  }, [isCustomizing])

  const scrollToIndex = useCallback((index: number) => {
    slideRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const handleSizeChange = useCallback(
    (size: WidgetSize) => {
      if (!activeWidget || !onChangeWidgetSize) return
      onChangeWidgetSize(activeWidget.i, size)
      setIsSizePopoverOpen(false)
    },
    [activeWidget, onChangeWidgetSize]
  )

  if (sortedWidgets.length === 0) {
    return null
  }

  const showTopBar = sortedWidgets.length > 1 || isCustomizing

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

      {showTopBar && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-1.5 shadow-sm backdrop-blur-sm">
            {isCustomizing && activeWidget && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-full"
                      aria-label={t("widgets.removeWidget")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("widgets.removeWidgetConfirm")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("widgets.removeWidgetDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("widgets.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRemoveWidget?.(activeWidget.i)}>
                        {t("widgets.removeWidget")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Popover open={isSizePopoverOpen} onOpenChange={setIsSizePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-full"
                      aria-label={t("widgets.changeSize")}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="flex flex-col gap-1">
                      {(["tiny", "medium", "large"] as const).map((option) => (
                        <Button
                          key={option}
                          variant={activeWidget.size === option ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleSizeChange(option)}
                          disabled={
                            !isValidMobileSize(activeWidget.type, option) ||
                            activeWidget.size === option
                          }
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "rounded",
                                option === "tiny" && "h-4 w-4",
                                option === "medium" && "h-4 w-8",
                                option === "large" && "h-4 w-12",
                                activeWidget.size === option ? "bg-primary" : "bg-muted"
                              )}
                            />
                            <span>
                              {option === "tiny" && t("widgets.size.mobile.small")}
                              {option === "medium" && t("widgets.size.mobile.medium")}
                              {option === "large" && t("widgets.size.mobile.large")}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {sortedWidgets.length > 1 && (
                  <div className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
                )}
              </>
            )}

            {sortedWidgets.length > 1 &&
              sortedWidgets.map((widget, index) => (
                <button
                  key={widget.i}
                  type="button"
                  aria-label={`Widget ${index + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
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
