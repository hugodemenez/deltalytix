"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ListTree, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type DocsNavItem = {
  id: string
  title: string
}

/** Matches sticky `top-20` (~80px) plus a little breathing room under the navbar. */
const SCROLL_OFFSET = 96

type DocsSectionNavProps = {
  items: DocsNavItem[]
  label: string
  jumpLabel: string
  closeLabel: string
}

export function DocsSectionNav({
  items,
  label,
  jumpLabel,
  closeLabel,
}: DocsSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "")
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const visibleSectionIds = useRef(new Set<string>())

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    const visibleIds = visibleSectionIds.current
    const initialHashFrame = window.requestAnimationFrame(() => {
      if (hash && items.some((item) => item.id === hash)) {
        setActiveId(hash)
      }
    })

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (elements.length === 0) {
      return () => window.cancelAnimationFrame(initialHashFrame)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id)
          } else {
            visibleIds.delete(entry.target.id)
          }
        }

        const firstVisibleItem = items.find((item) =>
          visibleIds.has(item.id),
        )
        if (firstVisibleItem) {
          setActiveId(firstVisibleItem.id)
        }
      },
      {
        rootMargin: `-${SCROLL_OFFSET}px 0px -55% 0px`,
        threshold: [0, 0.05, 0.15],
      },
    )

    for (const el of elements) {
      observer.observe(el)
    }

    return () => {
      window.cancelAnimationFrame(initialHashFrame)
      observer.disconnect()
      visibleIds.clear()
    }
  }, [items])

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return

    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.history.replaceState(null, "", `#${id}`)
    window.scrollTo({ top, behavior: "smooth" })
    setActiveId(id)
  }, [])

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  )
  const activeItem = items[activeIndex]

  return (
    <>
      <DialogPrimitive.Root
        open={isMobileNavOpen}
        onOpenChange={setIsMobileNavOpen}
      >
        <DialogPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={`${jumpLabel}: ${activeItem?.title ?? label}`}
            className="fixed right-[calc(env(safe-area-inset-right)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 flex h-12 min-w-16 items-center justify-center gap-2 rounded-full border border-black/10 bg-background/95 px-4 text-sm font-medium shadow-lg shadow-black/10 backdrop-blur-md transition-[color,background-color,transform] hover:bg-neutral-100 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:border-white/15 dark:shadow-black/30 dark:hover:bg-neutral-900 dark:focus-visible:outline-white lg:hidden"
          >
            <span className="tabular-nums" aria-hidden="true">
              {activeIndex + 1} / {items.length}
            </span>
            <ListTree className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </DialogPrimitive.Trigger>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed right-[calc(env(safe-area-inset-right)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex max-h-[min(70vh,32rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-black/10 bg-background/95 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl focus:outline-none dark:border-white/15 dark:shadow-black/40 lg:hidden"
          >
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <DialogPrimitive.Title className="text-sm font-medium tracking-tight">
                {label}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:outline-white"
                aria-label={closeLabel}
              >
                <X className="size-4" strokeWidth={2} aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            <nav aria-label={label} className="overflow-y-auto overscroll-contain">
              <ol className="space-y-0.5 pb-1">
                {items.map((item, index) => {
                  const isActive = activeId === item.id
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(event) => {
                          event.preventDefault()
                          setIsMobileNavOpen(false)
                          scrollToSection(item.id)
                        }}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm leading-snug tracking-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black dark:focus-visible:outline-white",
                          isActive
                            ? "bg-black/5 font-semibold text-black dark:bg-white/10 dark:text-white"
                            : "text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white",
                        )}
                        aria-current={isActive ? "location" : undefined}
                      >
                        <span
                          className="w-5 shrink-0 text-right text-xs tabular-nums text-black/40 dark:text-white/40"
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <span>{item.title}</span>
                      </a>
                    </li>
                  )
                })}
              </ol>
            </nav>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <aside className="w-full shrink-0 lg:w-[240px] xl:w-[260px]">
        <nav
          aria-label={label}
          className="sticky top-20 hidden lg:block"
        >
          <p className="mb-4 text-sm font-medium text-black/55 dark:text-white/55">
            {label}
          </p>
          <ul className="space-y-1 border-l border-black/10 dark:border-white/10">
            {items.map((item) => {
              const isActive = activeId === item.id
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(event) => {
                      event.preventDefault()
                      scrollToSection(item.id)
                    }}
                    className={cn(
                      "-ml-px block border-l-2 py-1.5 pl-4 text-sm leading-snug tracking-tight transition-colors",
                      isActive
                        ? "border-black text-black dark:border-white dark:text-white"
                        : "border-transparent text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white",
                    )}
                    aria-current={isActive ? "location" : undefined}
                  >
                    {item.title}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
