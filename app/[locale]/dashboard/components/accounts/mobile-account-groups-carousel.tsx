"use client"

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Account } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useCarouselGestureLock } from "@/hooks/use-carousel-gesture-lock"
import { useI18n } from "@/locales/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  /** Select the group containing the account, then scroll to that account. */
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
  const accountScrollerRef = useRef<HTMLDivElement>(null)
  const accountSlideRefs = useRef<(HTMLDivElement | null)[]>([])
  const pendingAccountScrollRef = useRef<string | null>(null)

  const groupIds = groups.map((group) => group.id).join(",")

  const [selectedGroupId, setSelectedGroupId] = useState(
    () => groups[0]?.id ?? ""
  )
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0)

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId]
  )

  const selectedAccounts = selectedGroup?.accounts ?? []

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroupId("")
      return
    }

    const selectedStillExists = groups.some((group) => group.id === selectedGroupId)
    if (!selectedStillExists) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, groupIds, selectedGroupId])

  useEffect(() => {
    setCurrentAccountIndex((index) =>
      index >= selectedAccounts.length
        ? Math.max(0, selectedAccounts.length - 1)
        : index
    )
    accountSlideRefs.current = accountSlideRefs.current.slice(
      0,
      selectedAccounts.length
    )
  }, [selectedAccounts.length, selectedGroupId])

  useEffect(() => {
    const scroller = accountScrollerRef.current
    if (!scroller || selectedAccounts.length === 0) return

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
          setCurrentAccountIndex(bestIndex)
        }
      },
      {
        root: scroller,
        threshold: [0.25, 0.5, 0.75, 1],
      }
    )

    accountSlideRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [selectedAccounts, selectedGroupId])

  const scrollToAccountIndex = useCallback((index: number) => {
    const scroller = accountScrollerRef.current
    if (!scroller) return

    scroller.scrollTo({
      top: index * scroller.clientHeight,
      behavior: "smooth",
    })
  }, [])

  const handleGroupChange = useCallback((groupId: string) => {
    pendingAccountScrollRef.current = null
    setSelectedGroupId(groupId)
    setCurrentAccountIndex(0)
    const scroller = accountScrollerRef.current
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: "auto" })
    }
  }, [])

  useEffect(() => {
    const accountId = pendingAccountScrollRef.current
    if (!accountId || !selectedGroup) return

    const accountIndex = selectedGroup.accounts.findIndex(
      (account) => account.id === accountId
    )
    if (accountIndex < 0) return

    const scroller = accountScrollerRef.current
    if (!scroller) return

    scroller.scrollTo({
      top: accountIndex * scroller.clientHeight,
      behavior: "smooth",
    })
    pendingAccountScrollRef.current = null
  }, [selectedGroup, selectedGroupId])

  useImperativeHandle(
    ref,
    () => ({
      scrollToAccount: (accountId: string) => {
        const group = groups.find((entry) =>
          entry.accounts.some((account) => account.id === accountId)
        )
        if (!group) return

        pendingAccountScrollRef.current = accountId
        if (group.id !== selectedGroupId) {
          setSelectedGroupId(group.id)
          setCurrentAccountIndex(0)
        } else {
          const accountIndex = group.accounts.findIndex(
            (account) => account.id === accountId
          )
          if (accountIndex >= 0) {
            scrollToAccountIndex(accountIndex)
            pendingAccountScrollRef.current = null
          }
        }
      },
    }),
    [groups, scrollToAccountIndex, selectedGroupId]
  )

  useCarouselGestureLock(accountScrollerRef)

  if (groups.length === 0 || !selectedGroup) {
    return null
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-2 px-2 pb-2">
        {groups.length > 1 ? (
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger
              className="h-9 min-w-0 flex-1"
              aria-label={t("accounts.mobile.selectGroup")}
            >
              <SelectValue placeholder={t("accounts.mobile.selectGroup")} />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {t("accounts.mobile.groupOption", {
                    groupName: group.name,
                    count: group.accounts.length,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {selectedGroup.name}
          </h3>
        )}

        {selectedAccounts.length > 1 && (
          <div className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            <span className="sr-only">
              {t("accounts.mobile.accountPosition", {
                index: currentAccountIndex + 1,
                total: selectedAccounts.length,
              })}
            </span>
            <span aria-hidden>
              {currentAccountIndex + 1}/{selectedAccounts.length}
            </span>
          </div>
        )}
      </div>

      <div
        ref={accountScrollerRef}
        className={cn(
          "min-h-0 flex-1 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
        )}
        role="region"
        aria-roledescription="carousel"
        aria-label={t("accounts.mobile.carouselNavigation")}
      >
        {selectedAccounts.map((item, index) => (
          <div
            key={item.id}
            id={`mobile-account-group-${selectedGroup.id}-slide-${item.id}`}
            data-slide-index={index}
            ref={(el) => {
              accountSlideRefs.current[index] = el
            }}
            className="h-full w-full shrink-0 snap-start snap-always px-2 pb-2"
            style={{ scrollSnapStop: "always" }}
            aria-label={item.label}
            aria-hidden={index !== currentAccountIndex}
          >
            <div className="h-full min-h-0 w-full">{renderAccount(item)}</div>
          </div>
        ))}
      </div>
    </div>
  )
})

MobileAccountGroupsCarousel.displayName = "MobileAccountGroupsCarousel"
