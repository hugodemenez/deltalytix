"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { getWidgetDisplayName } from "../lib/widget-display-name"
import { Widget } from "../types/dashboard"

const MINIMAP_SCALE = 0.15
const STACK_CARD_WIDTH = 44
const STACK_CARD_HEIGHT = 32

interface MobileWidgetMinimapProps {
  widgets: Widget[]
  currentIndex: number
  renderWidget: (widget: Widget) => React.ReactNode
  onSelectIndex: (index: number) => void
  slideHeight: string
}

function ScaledWidgetPreview({
  widget,
  renderWidget,
  slideHeight,
  className,
}: {
  widget: Widget
  renderWidget: (widget: Widget) => React.ReactNode
  slideHeight: string
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden bg-background", className)}>
      <div
        className="pointer-events-none origin-top-left"
        style={{
          transform: `scale(${MINIMAP_SCALE})`,
          width: `${100 / MINIMAP_SCALE}%`,
          height: slideHeight,
        }}
        aria-hidden
      >
        {renderWidget(widget)}
      </div>
    </div>
  )
}

export function MobileWidgetMinimap({
  widgets,
  currentIndex,
  renderWidget,
  onSelectIndex,
  slideHeight,
}: MobileWidgetMinimapProps) {
  const t = useI18n()
  const [isExpanded, setIsExpanded] = useState(false)

  const stackWidgets = useMemo(() => {
    if (widgets.length <= 1) return []
    const layers = Math.min(3, widgets.length - 1)
    return Array.from({ length: layers }, (_, stackOffset) => {
      const index = (currentIndex + 1 + stackOffset) % widgets.length
      return { widget: widgets[index], index, stackOffset }
    })
  }, [widgets, currentIndex])

  const upcomingWidgets = useMemo(() => {
    if (widgets.length <= 1) return []
    return Array.from({ length: widgets.length - 1 }, (_, step) => {
      const index = (currentIndex + 1 + step) % widgets.length
      return { widget: widgets[index], index }
    })
  }, [widgets, currentIndex])

  const handleSelect = useCallback(
    (index: number) => {
      onSelectIndex(index)
      setIsExpanded(false)
    },
    [onSelectIndex]
  )

  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isExpanded])

  if (widgets.length <= 1) {
    return null
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-haspopup="dialog"
        aria-label={t("widgets.mobile.minimapOpen", {
          index: currentIndex + 1,
          total: widgets.length,
        })}
        className={cn(
          "absolute bottom-4 right-3 z-20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isExpanded && "pointer-events-none opacity-0"
        )}
        onClick={() => setIsExpanded(true)}
      >
        <span className="relative block" style={{ width: STACK_CARD_WIDTH + 8, height: STACK_CARD_HEIGHT + 8 }}>
          {stackWidgets
            .slice()
            .reverse()
            .map(({ widget, stackOffset }) => (
              <span
                key={`${widget.i}-${stackOffset}`}
                className="absolute overflow-hidden rounded-md border border-border/80 bg-card shadow-md"
                style={{
                  width: STACK_CARD_WIDTH,
                  height: STACK_CARD_HEIGHT,
                  right: stackOffset * 4,
                  bottom: stackOffset * 4,
                  zIndex: 3 - stackOffset,
                }}
              >
                <ScaledWidgetPreview
                  widget={widget}
                  renderWidget={renderWidget}
                  slideHeight={slideHeight}
                  className="h-full w-full"
                />
              </span>
            ))}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("widgets.mobile.minimapNavigation")}
            className="absolute inset-0 z-30 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label={t("widgets.mobile.minimapClose")}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            />

            <motion.div
              className="relative z-10 m-3 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-2xl"
              initial={{ y: 24, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-medium">
                  {t("widgets.mobile.minimapNavigation")}
                </p>
                <button
                  type="button"
                  aria-label={t("widgets.mobile.minimapClose")}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 [-webkit-overflow-scrolling:touch]">
                <div
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                  role="listbox"
                  aria-label={t("widgets.mobile.minimapNavigation")}
                >
                  {upcomingWidgets.map(({ widget, index }) => {
                    const widgetName = getWidgetDisplayName(t, widget.type)

                    return (
                      <button
                        key={widget.i}
                        type="button"
                        role="option"
                        aria-selected={false}
                        aria-label={t("widgets.mobile.carouselGoTo", {
                          index: index + 1,
                          total: widgets.length,
                          widgetName,
                        })}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-xl border p-2 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40"
                        )}
                        onClick={() => handleSelect(index)}
                      >
                        <ScaledWidgetPreview
                          widget={widget}
                          renderWidget={renderWidget}
                          slideHeight={slideHeight}
                          className="aspect-[4/3] w-full rounded-lg border border-border/50"
                        />
                        <span className="truncate px-0.5 text-xs font-medium text-foreground/90">
                          {widgetName}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
