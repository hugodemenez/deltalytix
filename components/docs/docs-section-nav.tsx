"use client"

import { useCallback, useEffect, useState } from "react"
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
}

export function DocsSectionNav({ items, label, jumpLabel }: DocsSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "")

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    if (hash && items.some((item) => item.id === hash)) {
      setActiveId(hash)
    }

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )

        const topId = visible[0]?.target.id
        if (topId) {
          setActiveId(topId)
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

    return () => observer.disconnect()
  }, [items])

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return

    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.history.replaceState(null, "", `#${id}`)
    window.scrollTo({ top, behavior: "smooth" })
    setActiveId(id)
  }, [])

  return (
    <aside className="w-full shrink-0 lg:w-[240px] xl:w-[260px]">
      <div className="sticky top-14 z-30 -mx-5 border-b border-black/10 bg-background/95 px-5 py-3 backdrop-blur-sm dark:border-white/10 sm:-mx-8 sm:px-8 lg:hidden">
        <label htmlFor="docs-section-jump" className="sr-only">
          {jumpLabel}
        </label>
        <select
          id="docs-section-jump"
          value={activeId}
          onChange={(event) => scrollToSection(event.target.value)}
          className="h-10 w-full border border-black/10 bg-transparent px-3 text-sm tracking-tight outline-hidden dark:border-white/10"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </div>

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
  )
}
