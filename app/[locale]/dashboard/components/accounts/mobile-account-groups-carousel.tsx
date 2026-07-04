"use client"

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { Account } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useCarouselGestureLock } from "@/hooks/use-carousel-gesture-lock"
import { useI18n } from "@/locales/client"

export interface AccountGroupCarouselAccount {
  id: string
  label: string
  account: Account
}

export interface AccountGroupCarouselGroup {
  id: string
  name: string
  accounts: AccountGroupCarouselAccount[]
}

export interface MobileAccountGroupsCarouselHandle {
  /** Scroll vertically to the group containing the account, then horizontally to the account. */
  scrollToAccount: (accountId: string) => void
}

interface MobileAccountGroupsCarouselProps {
  groups: AccountGroupCarouselGroup[]
  renderAccount: (item: AccountGroupCarouselAccount) => React.ReactNode
  className?: string
}

export const MobileAccountGroupsCarousel = React.forwardRef<
  MobileAccountGroupsCarouselHandle,
  MobileAccountGroupsCarouselProps
>(function MobileAccountGroupsCarousel(
  { groups, renderAccount, className },
  ref
) {
  const t = useI18n()
  const verticalScrollerRef = useRef<HTMLDivElement>(null)
  const groupSlideRefs = useRef<(HTMLDivElement | null)[]>([])
  const horizontalScrollerRefs = useRef<Record<string, HTMLDivElement | null>>(
    {}
  )
  const horizontalSlideRefs = useRef<
    Record<string, (HTMLDivElement | null)[]>
  >({})
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [accountIndices, setAccountIndices] = useState<Record<string, number>>(
    {}
  )

  const groupIds = groups.map((group) => group.id).join(",")

  useEffect(() => {
    groupSlideRefs.current = groupSlideRefs.current.slice(0, groups.length)
    setCurrentGroupIndex((index) =>
      index >= groups.length ? Math.max(0, groups.length - 1) : index
    )
    setAccountIndices((prev) => {
      const next: Record<string, number> = {}
      for (const group of groups) {
        const current = prev[group.id] ?? 0
        next[group.id] =
          current >= group.accounts.length
            ? Math.max(0, group.accounts.length - 1)
            : current
      }
      return next
    })
  }, [groups.length, groupIds])

  useEffect(() => {
    const scroller = verticalScrollerRef.current
    if (!scroller || groups.length === 0) return

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
          setCurrentGroupIndex(bestIndex)
        }
      },
      {
        root: scroller,
        threshold: [0.25, 0.5, 0.75, 1],
      }
    )

    groupSlideRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [groups, groupIds])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    for (const group of groups) {
      const scroller = horizontalScrollerRefs.current[group.id]
      if (!scroller || group.accounts.length === 0) continue

      const observer = new IntersectionObserver(
        (entries) => {
          let bestIndex = -1
          let bestRatio = 0

          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const index = Number(
              (entry.target as HTMLElement).dataset.slideIndex
            )
            if (Number.isNaN(index) || index < 0) continue
            if (entry.intersectionRatio > bestRatio) {
              bestRatio = entry.intersectionRatio
              bestIndex = index
            }
          }

          if (bestIndex >= 0) {
            setAccountIndices((prev) => ({ ...prev, [group.id]: bestIndex }))
          }
        },
        {
          root: scroller,
          threshold: [0.25, 0.5, 0.75, 1],
        }
      )

      const slides = horizontalSlideRefs.current[group.id] ?? []
      slides.forEach((el) => {
        if (el) observer.observe(el)
      })
      observers.push(observer)
    }

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [groups, groupIds])

  const scrollToGroupIndex = useCallback((index: number) => {
    const scroller = verticalScrollerRef.current
    if (!scroller) return

    scroller.scrollTo({
      top: index * scroller.clientHeight,
      behavior: "smooth",
    })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      scrollToAccount: (accountId: string) => {
        let groupIndex = -1
        let accountIndex = -1

        for (let gi = 0; gi < groups.length; gi++) {
          const ai = groups[gi].accounts.findIndex(
            (account) => account.id === accountId
          )
          if (ai >= 0) {
            groupIndex = gi
            accountIndex = ai
            break
          }
        }

        if (groupIndex < 0) return

        const verticalScroller = verticalScrollerRef.current
        const group = groups[groupIndex]
        const horizontalScroller = horizontalScrollerRefs.current[group.id]

        const scrollHorizontal = () => {
          if (horizontalScroller && accountIndex >= 0) {
            horizontalScroller.scrollTo({
              left: accountIndex * horizontalScroller.clientWidth,
              behavior: "smooth",
            })
          }
        }

        if (verticalScroller) {
          verticalScroller.scrollTo({
            top: groupIndex * verticalScroller.clientHeight,
            behavior: "smooth",
          })

          // Wait for the vertical scroll to settle before scrolling horizontally
          // so the target group's horizontal scroller is laid out and measurable.
          const onVerticalScrollEnd = () => {
            verticalScroller.removeEventListener("scrollend", onVerticalScrollEnd)
            requestAnimationFrame(scrollHorizontal)
          }

          if ("onscrollend" in verticalScroller) {
            verticalScroller.addEventListener("scrollend", onVerticalScrollEnd, {
              once: true,
            })
          } else {
            window.setTimeout(scrollHorizontal, 350)
          }
        } else {
          scrollHorizontal()
        }
      },
    }),
    [groups]
  )

  useCarouselGestureLock(verticalScrollerRef)

  if (groups.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden",
        className
      )}
    >
      <div className="flex h-full w-full flex-row">
        <div
          ref={verticalScrollerRef}
          className={cn(
            "h-full min-w-0 flex-1 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          )}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("accounts.mobile.groupNavigation")}
        >
          {groups.map((group, groupIndex) => {
            const accountIndex = accountIndices[group.id] ?? 0

            return (
              <div
                key={group.id}
                id={`mobile-account-group-slide-${group.id}`}
                data-slide-index={groupIndex}
                ref={(el) => {
                  groupSlideRefs.current[groupIndex] = el
                }}
                className="flex h-full min-h-0 w-full shrink-0 snap-start snap-always flex-col px-2 pb-2"
                style={{ scrollSnapStop: "always" }}
                aria-label={group.name}
                aria-hidden={groupIndex !== currentGroupIndex}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 py-1">
                  <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.name}
                  </h3>
                  {group.accounts.length > 1 && (
                    <div className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      <span className="sr-only">
                        {t("accounts.mobile.accountPosition", {
                          index: accountIndex + 1,
                          total: group.accounts.length,
                        })}
                      </span>
                      <span aria-hidden>
                        {accountIndex + 1}/{group.accounts.length}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  ref={(el) => {
                    horizontalScrollerRefs.current[group.id] = el
                  }}
                  className={cn(
                    "flex min-h-0 flex-1 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    "snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]"
                  )}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label={t("accounts.mobile.carouselNavigation")}
                >
                  {group.accounts.map((item, index) => (
                    <div
                      key={item.id}
                      id={`mobile-account-group-${group.id}-slide-${item.id}`}
                      data-slide-index={index}
                      ref={(el) => {
                        if (!horizontalSlideRefs.current[group.id]) {
                          horizontalSlideRefs.current[group.id] = []
                        }
                        horizontalSlideRefs.current[group.id][index] = el
                      }}
                      className="h-full w-full min-w-full shrink-0 snap-start snap-always"
                      style={{ scrollSnapStop: "always" }}
                      aria-label={item.label}
                      aria-hidden={index !== accountIndex}
                    >
                      <div className="h-full min-h-0 w-full">
                        {renderAccount(item)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {groups.length > 1 && (
          <div
            className="flex h-full w-11 shrink-0 flex-col items-center gap-0 py-4 pr-1"
            role="group"
            aria-label={t("accounts.mobile.groupNavigation")}
          >
            {groups.map((group, index) => (
              <button
                key={group.id}
                type="button"
                aria-current={index === currentGroupIndex ? "true" : undefined}
                aria-controls={`mobile-account-group-slide-${group.id}`}
                aria-label={t("accounts.mobile.groupGoTo", {
                  index: index + 1,
                  total: groups.length,
                  groupName: group.name,
                })}
                className={cn(
                  "flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-full transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  index === currentGroupIndex
                    ? "bg-primary/10"
                    : "bg-muted/40 hover:bg-muted/60"
                )}
                onClick={() => scrollToGroupIndex(index)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "block min-h-6 w-2 rounded-full transition-all",
                    index === currentGroupIndex
                      ? "bg-primary"
                      : "bg-muted-foreground/60"
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

MobileAccountGroupsCarousel.displayName = "MobileAccountGroupsCarousel"
