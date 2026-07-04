"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useCarouselGestureLock } from "@/hooks/use-carousel-gesture-lock"
import { useI18n } from "@/locales/client"

export type AccountCarouselOrientation = "vertical" | "horizontal"

interface MobileAccountCardsCarouselProps {
  items: Array<{ id: string; label: string }>
  renderSlide: (item: { id: string; label: string }, index: number) => React.ReactNode
  orientation?: AccountCarouselOrientation
  className?: string
}

export function MobileAccountCardsCarousel({
  items,
  renderSlide,
  orientation = "vertical",
  className,
}: MobileAccountCardsCarouselProps) {
  const t = useI18n()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const itemIds = items.map((item) => item.id).join(",")

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, items.length)
    setCurrentIndex((index) =>
      index >= items.length ? Math.max(0, items.length - 1) : index
    )
  }, [items.length, itemIds])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || items.length === 0) return

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
  }, [items, itemIds])

  const scrollToIndex = useCallback(
    (index: number) => {
      const scroller = scrollerRef.current
      if (!scroller) return

      if (orientation === "vertical") {
        scroller.scrollTo({
          top: index * scroller.clientHeight,
          behavior: "smooth",
        })
        return
      }

      scroller.scrollTo({
        left: index * scroller.clientWidth,
        behavior: "smooth",
      })
    },
    [orientation]
  )

  useCarouselGestureLock(scrollerRef)

  if (items.length === 0) {
    return null
  }

  const isVertical = orientation === "vertical"

  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "flex h-full w-full",
          isVertical ? "flex-row" : "flex-col"
        )}
      >
        <div
          ref={scrollerRef}
          className={cn(
            "h-full min-w-0 flex-1 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            isVertical
              ? "snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
              : "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]"
          )}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("accounts.mobile.carouselNavigation")}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              id={`mobile-account-slide-${item.id}`}
              data-slide-index={index}
              ref={(el) => {
                slideRefs.current[index] = el
              }}
              className={cn(
                "shrink-0 snap-start snap-always",
                isVertical ? "h-full w-full" : "h-full w-full min-w-full"
              )}
              style={{ scrollSnapStop: "always" }}
              role="tabpanel"
              aria-label={item.label}
              aria-hidden={index !== currentIndex}
            >
              <div
                className={cn(
                  "h-full min-h-0 w-full",
                  isVertical ? "px-2 pb-2" : "px-2 pb-1"
                )}
              >
                {renderSlide(item, index)}
              </div>
            </div>
          ))}
        </div>

        {items.length > 1 && isVertical && (
          <div
            className="flex h-full w-11 shrink-0 flex-col items-center gap-0 py-4 pr-1"
            role="tablist"
            aria-orientation="vertical"
            aria-label={t("accounts.mobile.carouselNavigation")}
          >
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === currentIndex}
                aria-controls={`mobile-account-slide-${item.id}`}
                aria-label={t("accounts.mobile.carouselGoTo", {
                  index: index + 1,
                  total: items.length,
                  accountName: item.label,
                })}
                className={cn(
                  "flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-full transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  index === currentIndex
                    ? "bg-primary/10"
                    : "bg-muted/40 hover:bg-muted/60"
                )}
                onClick={() => scrollToIndex(index)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "block min-h-6 w-2 rounded-full transition-all",
                    index === currentIndex
                      ? "bg-primary"
                      : "bg-muted-foreground/60"
                  )}
                />
              </button>
            ))}
          </div>
        )}

        {items.length > 1 && !isVertical && (
          <div className="flex h-8 shrink-0 items-center justify-center px-2">
            <span className="sr-only" aria-live="polite">
              {t("accounts.mobile.accountPosition", {
                index: currentIndex + 1,
                total: items.length,
              })}
            </span>
            <span
              aria-hidden
              className="text-xs font-medium tabular-nums text-muted-foreground"
            >
              {currentIndex + 1}/{items.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
